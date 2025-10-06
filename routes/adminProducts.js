const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const isAdmin = require("../middleware/auth");

// Show all active products
router.get("/", isAdmin, (req, res) => {
  const queryActive = "SELECT * FROM products WHERE active = 1";
  const queryArchived = "SELECT * FROM products WHERE active = 0";
  const queryCategories = "SELECT * FROM product_category";

  conn.query(queryCategories, (err, categoryResults) => {
    if (err) throw err;
    conn.query(queryActive, (err2, activeResults) => {
      if (err) throw err2;
      conn.query(queryArchived, (err3, archivedResults) => {
        if (err2) throw err3;
        
        res.render("adminProducts", { 
          products: activeResults, 
          archivedProducts: archivedResults,
          categories: categoryResults
        });
      });
    });
  });
});

// Add new product
router.post("/add", isAdmin, (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  conn.query(
    "INSERT INTO products (name, description, price, stock, category_id, active) VALUES (?, ?, ?, ?, ?, 1)",
    [name, description, price, stock, category_id],
    (err) => {
      if (err) throw err;
      res.redirect("/admin/Products");
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
      res.redirect("/admin/Products");
    }
  );
});

// Soft delete (Archive product)
router.post("/archive/:id", isAdmin, (req, res) => {
  conn.query("UPDATE products SET active = 0 WHERE id = ?", [req.params.id], (err) => {
    if (err) throw err;
    res.redirect("/admin/Products");
  });
});

// Restore product
router.post("/restore/:id", isAdmin, (req, res) => {
  conn.query("UPDATE products SET active = 1 WHERE id = ?", [req.params.id], (err) => {
    if (err) throw err;
    res.redirect("/admin/Products");
  });
});

module.exports = router;
