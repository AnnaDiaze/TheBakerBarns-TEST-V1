const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

//This line contains the configuration to connect the database.
var conn = require('./dbConfig');

var bodyParser = require('body-parser');

// Set EJS as template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (css, images, etc.)
app.use(express.static(path.join(__dirname, "public")));

//This line uses the require function to include the express-session module.
var session = require('express-session');

//These lines will ensure that the express application can handle both JSON and URL-encoded data.
app.use(express.urlencoded({ extended: true })); // for form submissions
app.use(express.json());

// Body parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: false }));

//This will set up the express application to include the session middleware.
app.use(session({
	secret: 'yoursecret',
	resave: true,
	saveUninitialized: true
}));

// Make session user available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Cart session available in all view
app.use((req, res, next) => {
  res.locals.cart = req.session.cart || [];
  next();
});


// ROUTES
app.get("/", (req, res) => {
  res.render("home",);
});

// app.get('/', (req, res) => {
//   res.render('custom_cake', { user: req.session.user });
// });

app.get('/aboutus', function (req, res) {
    res.render('aboutus', { success: false });
    });

app.get('/login',function(req,res){
    res.render("login");
});

app.get('/register',function(req,res){
    res.render("register",{title:'Register'});
});

app.get('/login-required', (req, res) => {
  res.render('login-required'); 
});


// About us page -> contact_messages route
const contactRouter = require('./routes/contact');
app.use('/contact', contactRouter);

// Recipes page route
const recipesRoutes = require('./routes/recipes');
app.use('/', recipesRoutes);

// products page (our menu) route
const productRoutes = require("./routes/products");
app.use("/products", productRoutes);

// custom_cake page route
const customCakesRoutes = require('./routes/customCakes');
app.use('/custom_cake', customCakesRoutes)

// cart route
const cartRoutes = require('./routes/cart');
app.use('/cart', cartRoutes);

// checkout route
const checkoutRoutes = require('./routes/checkout');
app.use('/checkout', checkoutRoutes);


// AdminOnly
const adminOnlyRouter = require('./routes/adminOnly');
app.use('/adminOnly', adminOnlyRouter);

const adminOrdersRouter = require('./routes/adminOrders');
app.use('/admin/Orders', adminOrdersRouter);

const adminProductsRouter = require('./routes/adminProducts');
app.use('/admin/Products', adminProductsRouter);

const adminRecipesRoutes = require('./routes/adminRecipes');
app.use('/admin/Recipes', adminRecipesRoutes);

const adminUsersRoutes = require('./routes/adminUsers');
app.use('/admin/Users', adminUsersRoutes);

// adminproducts page
const adminProducts = require("./routes/adminProducts");
app.use("/admin/products", adminProducts);
// adminOrders page
const adminOrders = require("./routes/adminOrders");
app.use("/admin/orders", adminOrders)                                                                                                                                                                                                                      


//This will send a POST request to '/register' which will store the user information in a table.
app.post('/register', function(req, res) {
	let username = req.body.username;
	let email = req.body.email;
  let phone = req.body.phone;
	let password = req.body.password;
	if (username && password) {
		var sql = `INSERT INTO users (user_name, email, phone, password) VALUES ("${username}", "${email}", "${phone}", "${password}")`;
		conn.query(sql, function(err, result) {
			if (err) throw err;
			console.log('record inserted');
			res.render('login');
		})
	}
	else {
		console.log("Error");
	}
});

//NEW /auth route
app.post('/auth', function(req, res) {
    let email = req.body.email;
    let password = req.body.password;

    if (email && password) {
        conn.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], 
        function(error, results) {
            if (error) throw error;

            if (results.length > 0) {
                // ✅ Set session user object
                req.session.user = {
                    id: results[0].user_id,
                    username: results[0].user_name,
                    email: results[0].email,
                    phone: results[0].phone,
                    role: results[0].role // must be "admin" for admin user
                };

                console.log("User logged in:", req.session.user);

                // Redirect based on role
                if (results[0].role === "admin") {
                    res.redirect("/adminOnly"); // admin goes to AdminOnly page
                } else {
                    res.redirect("/"); // regular user goes to home page
                }
            } else {
                res.send('Incorrect Email and/or Password!');
            }
        });
    } else {
        res.send('Please enter Email and Password!');
    }
});



// Show all Orders (Admin view)
app.get('/admin/orders', (req, res) => {
  const sql = `
    SELECT o.*, 
           COALESCE(u.user_name) AS customer_name
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    ORDER BY o.created_at DESC
  `;
  
  conn.query(sql, (err, orders) => {
    if (err) throw err;
    res.render('adminOrders', { orders });
  });
});

// Update order status
app.post('/admin/orders/update/:id', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  conn.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    (err) => {
      if (err) throw err;
      res.redirect('/admin/orders');
    }
  );
});

// View single order details (Admin view)
app.get('/admin/orders/:id', (req, res) => {
  const orderId = req.params.id;

  // Get order info
  const orderSql = `
    SELECT o.*, COALESCE(u.user_name) AS customer_name
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    WHERE o.id = ?
  `;

  // Get order items (PRODUCTS + CUSTOM_CAKES)
  const itemsSql = `
    SELECT
      oi.*,
      COALESCE(p.name, cco.name_snapshot) AS product_name
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN custom_cake_orders cco ON oi.custom_cake_order_id = cco.id
    WHERE oi.order_id = ?
  `;

  conn.query(orderSql, [orderId], (err, orderResult) => {
    if (err) throw err;
    if (orderResult.length === 0) {
      return res.status(404).send('Order not found');
    }

    const order = orderResult[0];

    conn.query(itemsSql, [orderId], (err2, itemsResult) => {
      if (err2) throw err2;
      res.render('adminOrderDetails', { order, items: itemsResult });
    });
  });
});


//This will be used to return to home page after the members logout.
app.get('/logout',(req,res) => {
	req.session.destroy();
	res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Node app is running on port 3000`);
});
