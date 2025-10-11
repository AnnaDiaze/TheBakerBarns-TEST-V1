// routes/cart.js
const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const {
  getCurrentCart,
  getCartItems,
  addItemToCart,
  updateCartItem,
  removeCartItem
} = require("../utils/cartHelper");

// 🧩 Middleware: Load or create user/guest cart
async function loadCart(req, res, next) {
  try {
    if (req.session.user) {
      req.cart = await getCurrentCart(req.session.user.id);
      req.isGuest = false;
    } else {
      if (!req.session.guestId) {
        req.session.guestId = "guest_" + Math.random().toString(36).substr(2, 9);
      }
      req.cart = await getCurrentCart(null, req.session.guestId);
      req.isGuest = true;
    }
    next();
  } catch (err) {
    console.error("❌ loadCart error:", err);
    next(err);
  }
}

// 🛒 View cart
router.get("/", loadCart, async (req, res) => {
  try {
    const items = await getCartItems(req.cart.id);
    res.render("cart", {
      cartItems: items,
      user: req.session.user
    });
  } catch (err) {
    console.error("Cart load error:", err);
    res.status(500).send("Failed to load cart");
  }
});

// 🧺 Add item (works for both products + custom cakes)
router.post("/add", loadCart, async (req, res) => {
  try {
    let {
      product_id,
      product_name,
      price,
      quantity,
      custom_cake_order_id,
      meta
    } = req.body;

    console.log("🧾 ADD TO CART:", req.body); //degub line

    // Clean values
    product_id = product_id ? Number(product_id) : null;
    custom_cake_order_id = custom_cake_order_id ? Number(custom_cake_order_id) : null;
    price = parseFloat(price) || 0;
    quantity = parseInt(quantity) || 1;

    if (!product_id && !custom_cake_order_id) {
      return res.status(400).json({ success: false, error: "Missing item ID." });
    }

    await addItemToCart(req.cart.id, {
      product_id,
      product_name,
      price,
      quantity,
      custom_cake_order_id,
      meta
    });

    return res.json({ success: true, message: "Item added to cart!" });
  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ success: false, error: "Failed to add item." });
  }
});

// 🔄 Update quantity
router.post("/update", loadCart, async (req, res) => {
  try {
    const { item_id, quantity } = req.body;
    await updateCartItem(item_id, quantity);
    res.redirect("/cart");
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).send("Error updating cart");
  }
});

// ❌ Remove item
router.post("/remove", loadCart, async (req, res) => {
  try {
    const { item_id } = req.body;
    await removeCartItem(item_id);
    res.redirect("/cart");
  } catch (err) {
    console.error("Remove cart error:", err);
    res.status(500).send("Error removing item");
  }
});

module.exports = router;
