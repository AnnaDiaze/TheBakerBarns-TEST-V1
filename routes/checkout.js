const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');

// Middleware to ensure login
function ensureLoggedIn(req, res, next) {
  if (!req.session.user) return res.render('login-required');
  next();
}

// Show checkout form
router.get('/checkout', ensureLoggedIn, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');

  const user = req.session.user; // logged-in user info
  res.render('checkout', { cart, user });
});

// Handle checkout submission
router.post('/checkout', ensureLoggedIn, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');

  const { pickup_date, name, email, phone } = req.body; // updated info

  // Validate pickup date
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate()+1);
  if (new Date(pickup_date) < tomorrow) {
    return res.status(400).send("Pickup date must be from tomorrow onwards.");
  }

  const userId = req.session.user.id;
  const total_amount = cart.reduce((sum,item) => sum + item.price*item.quantity, 0);

  // Update user details if changed
  conn.query(
    'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
    [name, email, phone, userId],
    (err) => {
      if(err) console.error('Error updating user info:', err);
    }
  );

  const orderData = {
    customer_id: userId,
    order_date: new Date(),
    pickup_date,
    status: 'pending',
    total_amount
  };

  // Insert order
  conn.query('INSERT INTO orders SET ?', orderData, (err, result) => {
    if (err) {
      console.error('Error inserting order:', err);
      return res.status(500).send('Error placing your order.');
    }

    const orderId = result.insertId;
    const orderItems = cart.map(item => [
      orderId,
      item.id,
      item.custom_cake_orders_id || null,
      item.quantity,
      item.price
    ]);

    conn.query(
      'INSERT INTO order_items (order_id, product_id, custom_cake_orders_id, quantity, price_each) VALUES ?',
      [orderItems],
      (err2) => {
        if (err2) {
          console.error('Error inserting order items:', err2);
          return res.status(500).send('Error saving order items.');
        }

        req.session.cart = [];
        res.render('order-success', { orderId });
      }
    );
  });
});

module.exports = router;
