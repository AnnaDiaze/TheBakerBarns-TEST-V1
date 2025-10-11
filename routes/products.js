const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const { getCurrentCart, addItemToCart } = require("../utils/cartHelper");

// 🛍 Products page
router.get("/", (req, res) => {
  let productSql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN product_category c ON p.category_id = c.id
    WHERE p.active = 1
  `;
  const productParams = [];

  if (req.query.category) {
    productSql += " AND p.category_id = ?";
    productParams.push(req.query.category);
  }

  // Sorting
  if (req.query.sort) {
    if (req.query.sort === "name") productSql += " ORDER BY p.name ASC";
    else if (req.query.sort === "price_low") productSql += " ORDER BY p.price ASC";
    else if (req.query.sort === "price_high") productSql += " ORDER BY p.price DESC";
  }

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

module.exports = router;
