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

// for AJAX
app.use(express.json()); 
// for forms
app.use(express.urlencoded({ extended: true })); 


// ROUTES
app.get("/", (req, res) => {
  res.render("home",);
});

app.get('/custom', function (req, res) {
    res.render("custom");
    });

app.get('/classes', function (req, res) {
    res.render("classes");
    });

// app.get('/blog', function (req, res) {
//     res.render("blog");
//     });

app.get('/aboutus', function (req, res) {
    res.render('aboutus', { success: false });
    });

app.get('/login',function(req,res){
    res.render("login");
});

app.get('/register',function(req,res){
    res.render("register",{title:'Register'});
});

// AdminOnly
const adminOnlyRouter = require('./routes/adminOnly');
app.use('/adminOnly', adminOnlyRouter);

const adminOrdersRouter = require('./routes/adminOrders');
app.use('/admin/Orders', adminOrdersRouter);

const adminProductsRouter = require('./routes/adminProducts');
app.use('/admin/Products', adminProductsRouter);

const adminRecipesRoutes = require('./routes/adminRecipes');
app.use('/admin/Recipes', adminRecipesRoutes);

// About us page -> contact_messages
const contactRouter = require('./routes/contact');
app.use('/contact', contactRouter);

const recipesRoutes = require('./routes/recipes');
app.use('/', recipesRoutes);

// Show cart form
app.get("/cart", (req, res) => {
  res.render("cart", { cart: req.session.cart || [] });
});

//This will send a POST request to '/register' which will store 
//the user information in a table.
app.post('/register', function(req, res) {
	let username = req.body.username;
	let email = req.body.email;
	let password = req.body.password;
	if (username && password) {
		var sql = `INSERT INTO users (user_name, email, password) VALUES ("${username}", "${email}", "${password}")`;
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

// adminproducts page
const adminProducts = require("./routes/adminProducts");
app.use("/admin/products", adminProducts);
// adminOrders page
const adminOrders = require("./routes/adminOrders");
app.use("/admin/orders", adminOrders)

// products page
app.get("/products", (req, res) => {
  let productSql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN product_category c ON p.category_id = c.id
  `;
  const productParams = [];

  if (req.query.category) {
    productSql += " WHERE p.category_id = ?";
    productParams.push(req.query.category);
  }

  // Sorting
  if (req.query.sort) {
    if (req.query.sort === "name") {
      productSql += " ORDER BY p.name ASC";
    } else if (req.query.sort === "price_low") {
      productSql += " ORDER BY p.price ASC";
    } else if (req.query.sort === "price_high") {
      productSql += " ORDER BY p.price DESC";
    }
  }

  // Get categories + products
  const categorySql = "SELECT id, name FROM product_category ORDER BY name";

  conn.query(productSql, productParams, (err, products) => {
    if (err) throw err;

    conn.query(categorySql, (err, categories) => {
      if (err) throw err;

      res.render("products", {
        products,
        categories,
        currentCategory: req.query.category || null,
        sort: req.query.sort || "default"
      });
    });
  });
});

// Add to cart
app.post("/cart/add", (req, res) => {
  const { product_id, quantity } = req.body;

  // Example: fetch product from DB
  conn.query("SELECT * FROM products WHERE id = ?", [product_id], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.json({ success: false, message: "Product not found" });

    const product = results[0];

    if (!req.session.cart) req.session.cart = [];

    // Check if already in cart
    const existing = req.session.cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: parseInt(quantity)
      });
    }

    res.json({ success: true });
  });
});

// Update quantity in the cart
app.post('/cart/update', (req, res) => {
  const { product_id, quantity } = req.body;
  if (req.session.cart) {
    const item = req.session.cart.find(p => p.id == product_id);
    if (item) item.quantity = parseInt(quantity);
  }
  res.redirect('/cart');
});

// Remove item from cart
app.post('/cart/remove', (req, res) => {
  const { product_id } = req.body;
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(p => p.id != product_id);
  }
  res.redirect('/cart');
});

// Show checkout form
app.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.redirect('/cart'); // no empty checkout
  }
  res.render('checkout', { cart, user: req.session.user });
});

// Handle checkout form submission
app.post('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  const { guest_name, guest_email, guest_phone, pickup_date } = req.body;
  // Validation: pickup date must be >= tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const selectedDate = new Date(pickup_date);

  if (selectedDate < tomorrow) {
    return res.status(400).send("Pickup date must be from tomorrow onwards.");
    // or render an error view instead of plain text
  }

   // ... continue inserting into orders + order_items
  const customer_id = req.session.user ? req.session.user.id : null;
  const total_amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderData = {
    customer_id,
    guest_name: guest_name || null,
    guest_email: guest_email || null,
    guest_phone: guest_phone || null,
    order_date: new Date(),
    pickup_date,
    status: 'pending',
    total_amount
  };

  conn.query('INSERT INTO orders SET ?', orderData, (err, result) => {
    if (err) {
      console.error('Error inserting order:', err);  // log error to server
      return res.status(500).send('Something went wrong while placing your order. Please try again.');
    }

    const orderId = result.insertId;

    const orderItems = cart.map(item => [
      orderId,
      item.id,
      null, // custom_cake_id if needed
      item.quantity,
      item.price
    ]);

    conn.query(
      'INSERT INTO order_items (order_id, product_id, custom_cake_id, quantity, price_each) VALUES ?',
      [orderItems],
      (err2) => {
        if (err2) {
          console.error('Error inserting order items:', err2);
          return res.status(500).send('Something went wrong while saving your order items. Please try again.');
        }

        // Clear cart
        req.session.cart = [];

        res.render('order-success', { orderId });
      }
    );
  });
});

// Show all Orders (Admin view)
app.get('/admin/orders', (req, res) => {
  const sql = `
    SELECT o.*, 
           COALESCE(u.user_name, o.guest_name) AS customer_name
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
    SELECT o.*, COALESCE(u.user_name, o.guest_name) AS customer_name
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    WHERE o.id = ?
  `;

  // Get order items
  const itemsSql = `
    SELECT oi.*, p.name AS product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
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
