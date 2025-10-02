//all product management routes (add/update/delete).
// routes/adminProducts.js
const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const isAdmin = require("../middleware/auth");

// Show product list (with edit/delete options)
router.get("/", isAdmin, (req, res) => {
  conn.query("SELECT * FROM products", (err, results) => {
    if (err) throw err;
    res.render("adminProducts", { products: results });
  });
});

// Add new product
router.post("/add", isAdmin, (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  conn.query(
    "INSERT INTO products (name, description, price, stock, category_id ) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, stock, category_id],
    (err) => {
      if (err) throw err;
      res.redirect("/admin/products");
    }
  );
});

// Update product
router.post("/update/:id", isAdmin, (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  conn.query(
    "UPDATE products SET name=?, description=?, price=?, stock=?, category_id=? WHERE id=?",
    [name, description, price, stock, category_id, req.params.id],
    (err) => {
      if (err) throw err;
      res.redirect("/admin/products");
    }
  );
});

// Delete product
router.post("/delete/:id", isAdmin, (req, res) => {
  conn.query("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
    if (err) throw err;
    res.redirect("/admin/products");
  });
});

module.exports = router;
