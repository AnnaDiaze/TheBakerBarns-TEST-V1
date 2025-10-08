const express = require('express');
const router = express.Router();

// add to cart
router.post('/add', (req, res) => {
  const { product_id, product_name, quantity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  // simulate product (you can later fetch from DB)
  const product = {
     id: product_id, 
     name: product_name, 
     price: 10, 
     quantity: parseInt(quantity)
     };
  req.session.cart.push(product);
  console.log('Cart:', req.session.cart);

  res.json({ success: true, cartCount: req.session.cart.length });
});

// view cart
router.get('/', (req, res) => {
  res.render('cart', { cart: req.session.cart || [] });
});

module.exports = router;
