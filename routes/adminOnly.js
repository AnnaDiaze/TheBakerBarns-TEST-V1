// routes/adminOnly.js
const express = require('express');
const router = express.Router();
const conn = require("../dbConfig");
const { isAdmin } = require("../middleware/auth");

router.get('/', isAdmin, async (req, res) => {
  try {
    const db = conn.promise();
    const username = (req.session.user && req.session.user.username) || "Admin";

    // Orders
    const [[{ ordersTotal }]]     = await db.query('SELECT COUNT(*) AS ordersTotal FROM orders');
    const [[{ ordersCompleted }]] = await db.query('SELECT COUNT(*) AS ordersCompleted FROM orders WHERE status = "completed"');
    const [[{ ordersPending }]]   = await db.query('SELECT COUNT(*) AS ordersPending FROM orders WHERE status = "pending"');

    // Products
    const [[{ productsActive }]]   = await db.query('SELECT COUNT(*) AS productsActive FROM products WHERE active = 1');
    const [[{ productsArchived }]] = await db.query('SELECT COUNT(*) AS productsArchived FROM products WHERE active = 0');
    const [[{ productsLowStock }]] = await db.query('SELECT COUNT(*) AS productsLowStock FROM products WHERE stock IS NOT NULL AND stock <= 3');

    // Users
    const [[{ usersTotal }]]   = await db.query('SELECT COUNT(*) AS usersTotal FROM users');
    const [[{ usersActive }]]  = await db.query('SELECT COUNT(*) AS usersActive FROM users WHERE is_active = 1');
    const [[{ usersBlocked }]] = await db.query('SELECT COUNT(*) AS usersBlocked FROM users WHERE is_active = 0');

    // Messages (NEW)
    const [[{ messagesNew }]]   = await db.query('SELECT COUNT(*) AS messagesNew FROM contact_messages WHERE status = "new"');
    const [[{ messagesTotal }]] = await db.query('SELECT COUNT(*) AS messagesTotal FROM contact_messages');

    // Month sales total (completed orders only)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNext  = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [[{ monthSalesTotal }]] = await db.query(
      'SELECT COALESCE(SUM(total_amount), 0) AS monthSalesTotal FROM orders WHERE status = "completed" AND order_date >= ? AND order_date < ?',
      [startOfMonth, startOfNext]
    );

    const monthName = startOfMonth.toLocaleString('en-US', { month: 'long' });

    res.render('adminOnly', {
      username,
      // Orders
      ordersTotal, ordersCompleted, ordersPending,
      // Products
      productsActive, productsArchived, productsLowStock,
      // Users
      usersTotal, usersActive, usersBlocked,
      // Messages (NEW)
      messagesNew, messagesTotal,
      // Month
      monthName,
      monthSalesTotal: Number(monthSalesTotal || 0)
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Failed to load admin dashboard.');
  }
});

module.exports = router;
