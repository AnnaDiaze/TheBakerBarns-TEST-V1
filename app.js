const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

const bcrypt = require('bcrypt'); //password encrypt
const SALT_ROUNDS = 10; // default

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

app.get('/aboutus', function (req, res) {
    res.render('aboutus', { success: false });
    });

app.get('/login', (req, res) => {
  const error = req.session.authError || null;
  const form  = req.session.authForm || {};
  // clear after reading
  req.session.authError = null;
  req.session.authForm = null;

  res.render('login', { error, form });
});

app.get('/register', (req, res) => {
  const error = req.session.registerError || null;
  const form = req.session.registerForm || {};
  req.session.registerError = null;
  req.session.registerForm = null;

  res.render('register', { error, form });
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

const adminMessagesRouter = require('./routes/adminMessages');
app.use('/admin/Messages', adminMessagesRouter);

const adminUsersRoutes = require('./routes/adminUsers');
app.use('/admin/Users', adminUsersRoutes);

// adminproducts page
const adminProducts = require("./routes/adminProducts");
app.use("/admin/products", adminProducts);
// adminOrders page
const adminOrders = require("./routes/adminOrders");
app.use("/admin/orders", adminOrders)                                                                                                                                                                                                                      


//Register new user
app.post('/register', async function(req, res) {
  const { username, email, phone, password } = req.body;

  if (!username || !email || !password) {
    req.session.registerError = "Please fill in all required fields.";
    req.session.registerForm = { username, email, phone };
    return res.redirect('/register');
  }

  try {
    // Email uniqueness
    const [existing] = await conn.promise().query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      req.session.registerError = "Email already registered. Please login instead.";
      req.session.registerForm = { username, email, phone };
      return res.redirect('/register');
    }

    // Hash password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert
    const [result] = await conn.promise().query(
      'INSERT INTO users (user_name, email, phone, password) VALUES (?, ?, ?, ?)',
      [username, email, phone, hashed]
    );

    // (Optional) auto-login
    req.session.user = {
      id: result.insertId,
      username,
      email,
      phone,
      role: "customer"
    };

    res.redirect('/');
  } catch (err) {
    console.error('Register error:', err);
    req.session.registerError = "Something went wrong. Please try again.";
    req.session.registerForm = { username, email, phone };
    res.redirect('/register');
  }
});



//NEW /auth route
app.post('/auth', async function(req, res) {
  const email = req.body.email || '';
  const password = req.body.password || '';

  if (!email || !password) {
    req.session.authError = 'Please enter Email and Password!';
    req.session.authForm = { email };
    return res.redirect('/login');
  }

  try {
    const [rows] = await conn.promise().query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const user = rows[0];
    // Use the same generic error to avoid leaking which field failed
    const fail = () => {
      req.session.authError = 'Incorrect Email and/or Password!';
      req.session.authForm = { email };
      return res.redirect('/login');
    };

    if (!user) return fail();

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return fail();

    req.session.user = {
      id: user.user_id,
      username: user.user_name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    // Clear stale messages
    req.session.authError = null;
    req.session.authForm = null;

    return user.role === 'admin' ? res.redirect('/adminOnly') : res.redirect('/');
  } catch (err) {
    console.error('Auth error:', err);
    req.session.authError = 'Something went wrong. Please try again.';
    req.session.authForm = { email };
    return res.redirect('/login');
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
