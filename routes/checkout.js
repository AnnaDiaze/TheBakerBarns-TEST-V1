// routes/checkout.js
const express = require('express');
const router = express.Router();
const { getCurrentCart, getCartItems } = require("../utils/cartHelper");
const conn = require('../dbConfig');

// ✅ Middleware: only logged-in users
function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login-required");
}

// ✅ SHOW CHECKOUT FORM
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const cart = await getCurrentCart(userId);
    const items = await getCartItems(cart.id);

    // Ensure all prices are numbers
    const cartItems = items.map(i => ({
      ...i,
      price: parseFloat(i.price) || 0,
      quantity: parseInt(i.quantity) || 1,
    }));

    res.render('checkout', { cart: cartItems, user: req.session.user });
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).send('Error fetching cart.');
  }
});

// ✅ HANDLE CHECKOUT SUBMISSION
router.post('/', isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, phone, pickup_date } = req.body;

    // Validate pickup date (at least tomorrow)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (new Date(pickup_date) < tomorrow) {
      return res.status(400).send("Pickup date must be from tomorrow onwards.");
    }

    // ✅ Update user info
    await conn.promise().query(
      'UPDATE users SET user_name = ?, email = ?, phone = ? WHERE user_id = ?',
      [name, email, phone, userId]
    );

    // ✅ Get current cart + items
    const cart = await getCurrentCart(userId);
    const items = await getCartItems(cart.id);
    if (!items.length) return res.redirect('/cart');

    // ✅ Normalize item data
    const cartItems = items.map(i => ({
      ...i,
      price: parseFloat(i.price) || 0,
      quantity: parseInt(i.quantity) || 1,
    }));

    // ✅ Calculate total
    const total_amount = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // ✅ Create order
    const [orderResult] = await conn.promise().query(
      'INSERT INTO orders (customer_id, order_date, pickup_date, status, total_amount, created_at, updated_at) VALUES (?, NOW(), ?, "pending", ?, NOW(), NOW())',
      [userId, pickup_date, total_amount]
    );

    const orderId = orderResult.insertId;

    // ✅ Prepare order item data (match DB table columns exactly)
    const orderItems = cartItems.map(i => [
      orderId,
      i.product_id || null,
      i.custom_cake_order_id || null,
      i.quantity,
      parseFloat(i.price) || 0, // price_each
      new Date(), // created_at
      new Date()  // updated_at
    ]);

    // ✅ Insert order details (matches your DB table name)
    if (orderItems.length > 0) {
      await conn.promise().query(
        `INSERT INTO order_items 
          (order_id, product_id, custom_cake_order_id, quantity, price_each, created_at, updated_at)
         VALUES ?`,
        [orderItems]
      );
    }

    // ✅ Mark cart as ordered
    await conn.promise().query('UPDATE carts SET status = "ordered" WHERE id = ?', [cart.id]);

    // ✅ Clear cart items (optional)
    await conn.promise().query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);

    res.render('order-success', { orderId });
  } catch (err) {
    console.error("❌ Error during checkout:", err);
    res.status(500).send("Error saving order items.");
  }
});

module.exports = router;
