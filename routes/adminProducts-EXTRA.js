//all product management routes (add/update/delete).
// routes/adminProducts.js
const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const isAdmin = require("../middleware/auth");

// Show product list (with edit/delete options)
router.get("/", isAdmin, (req, res) =>{
  conn.query("SELECT * FROM products", function(err, results) {
    if (err) throw err;
    res.render("adminProducts", { products: results });
  });
});

// Add new product
// TEST1



// TEST2
// router.post("/add", isAdmin, function(req, res) {
// 	let name = req.body.name;
// 	let price = req.body.price;
// 	let description = req.body.description;
//   	let stock = req.body.stock;
//   	let category = req.body.category;
// 	if (name && price && description && stock && category) {
// 		var sql = `INSERT INTO products (name, price, description, stock, category) VALUES ("${name}", "${price}", "${description}", "${stock}" , "${category}")`;
// 		conn.query(sql, function(err, result) {
// 			if (err) throw err;
// 			console.log('record inserted');
// 			res.redirect('/admin/products');			
// 		})
// 	}
// 	else {
// 		console.log("Error");
// 	}
//   });

// UPDATE PRODUCTS
// TEST1
// router.post("/update/:id", isAdmin, (req, res) => {
//   const { name, price, description } = req.body;
//   conn.query(
//     "UPDATE products SET name=?, price=?, description=? WHERE id=?",
//     [name, price, description, req.params.id],
//     (err) => {
//       if (err) throw err;
//       res.redirect("/admin/products");
//     }
//   );
// });

// TEST2
// router.post("/update/:id", (req, res) => {
//   const { name, price, description } = req.body;
//   const id = req.params.id;

//   // Build SQL dynamically so empty description doesn't wipe it
//   let sql = "UPDATE products SET name = ?, price = ?";
//   let values = [name, price];

//   if (description && description.trim() !== "") {
//     sql += ", description = ?";
//     values.push(description);
//   }

//   sql += " WHERE id = ?";
//   values.push(id);

//   conn.query(sql, values, (err, result) => {
//     if (err) throw err;
//     res.redirect("/admin/products");
//   });
// });

// TEST3
router.post("/update/:id", (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const id = req.params.id;

  const sql = "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ? WHERE id = ?";
  const values = [name, description, price, stock, category , id];

  conn.query(sql, values, (err, result) => {
    if (err) throw err;
    res.redirect("/admin/products");
  });
});


// Delete product
router.post("/delete/:id", isAdmin, (req, res) => {
  conn.query("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
    if (err) throw err;
    res.redirect("/admin/products");
  });
});

module.exports = router;