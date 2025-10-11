// routes/adminOrders.js

const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const {isAdmin} = require("../middleware/auth");

// Show all orders

router.get("/", isAdmin, (req, res) => {
  const query = `
    SELECT 
      o.id,
      COALESCE(u.user_name) AS customer_name,
      COALESCE(u.email) AS email,
      COALESCE(u.phone) AS phone,
      o.pickup_date,
      o.total_amount,
      o.status
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    ORDER BY o.id DESC
  `;

  conn.query(query, (err, results) => {
    if (err) throw err;
    res.render("adminOrders", { orders: results });
  });
});


// View single order details

router.get("/:id", isAdmin, (req, res) => {
  const orderId = req.params.id;

  const orderQuery = `
    SELECT 
      o.id,
      COALESCE(u.user_name) AS customer_name,
      COALESCE(u.email) AS email,
      COALESCE(u.phone) AS phone,
      o.pickup_date,
      o.total_amount,
      o.status
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    WHERE o.id = ?
  `;

  const itemsQuery = `
    SELECT oi.quantity, oi.price_each, p.name AS product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `;

  conn.query(orderQuery, [orderId], (err, orderResults) => {
    if (err) throw err;
    if (orderResults.length === 0) return res.status(404).send("Order not found");

    conn.query(itemsQuery, [orderId], (err, itemsResults) => {
      if (err) throw err;

      res.render("adminOrderDetails", {
        order: orderResults[0],
        items: itemsResults
      });
    });
  });
});

// Update order status

router.post("/update/:id", isAdmin, (req, res) => {
  const { status } = req.body;
  conn.query(
    "UPDATE orders SET status=? WHERE id=?",
    [status, req.params.id],
    (err) => {
      if (err) throw err;
      res.redirect("/admin/orders");
    }
  );
});

// Delete order
router.post("/delete/:id", isAdmin, (req, res) => {
  conn.query("DELETE FROM orders WHERE id=?", [req.params.id], (err) => {
    if (err) throw err;
    res.redirect("/admin/orders");
  });
});

module.exports = router;