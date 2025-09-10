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

app.get('/blog', function (req, res) {
    res.render("blog");
    });

app.get('/aboutus', function (req, res) {
    res.render("aboutus");
    });

app.get('/login',function(req,res){
    res.render("login");
});

app.get('/register',function(req,res){
    res.render("register",{title:'Register'});
});

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
                    id: results[0].id,
                    username: results[0].user_name,
                    email: results[0].email,
                    role: results[0].role // must be "admin" for admin user
                };

                console.log("User logged in:", req.session.user);

                // Redirect based on role
                if (results[0].role === "admin") {
                    res.redirect("/admin/products"); // admin goes to product management page
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

// Update quantity
app.post('/cart/update', (req, res) => {
  const { product_id, quantity } = req.body;
  if (req.session.cart) {
    const item = req.session.cart.find(p => p.id == product_id);
    if (item) item.quantity = parseInt(quantity);
  }
  res.redirect('/cart');
});

// Remove item
app.post('/cart/remove', (req, res) => {
  const { product_id } = req.body;
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(p => p.id != product_id);
  }
  res.redirect('/cart');
});

//This will be used to return to home page after the members logout.
app.get('/logout',(req,res) => {
	req.session.destroy();
	res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Node app is running on port 3000`);
});
