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


// Routes
app.get("/", (req, res) => {
  res.render("home",);
});

// app.get('/products', function (req, res) {
//     res.render("products");
//     });

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

//This will check whether the records in the table match with the credentials 
//entered during login.
app.post('/auth', function(req, res) {
	let email = req.body.email;
	let password = req.body.password;
	if (email && password) {
		conn.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], 
		function(error, results, fields) {
			if (error) throw error;
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.email = email;
				req.session.role =  results[0].role;
				console.log("user name :", results[0].user_name);
				console.log("user role :", results[0].role);
				console.log("user email :", results[0].email);
				
				res.redirect('/');
			} else {
				res.send('Incorrect Email and/or Password!');
			}			
			res.end();
		});
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	}
});

//This will be used to return to home page after the members logout.
app.get('/logout',(req,res) => {
	req.session.destroy();
	res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Node app is running on port 3000`);
});

// products page
app.get("/products", (req, res) => {
  const sort = req.query.sort || "default";

  let sql = "SELECT * FROM products";
  if (sort === "name") sql += " ORDER BY name ASC";
  if (sort === "price_low") sql += " ORDER BY price ASC";
  if (sort === "price_high") sql += " ORDER BY price DESC";

  conn.query(sql, (err, results) => {
    if (err) throw err;
	console.log(results);
    // 👇 pass products to the view
    res.render("products", { products: results });
  });
});