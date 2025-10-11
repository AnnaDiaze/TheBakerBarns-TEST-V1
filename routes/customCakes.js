// routes/customCakes.js
const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const { getCurrentCart, addItemToCart } = require("../utils/cartHelper");

// tiny promise helper
function q(sql, params=[]) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

// Load base cakes (use your real criteria if needed)
async function getBaseCakes() {
  return q(`
    SELECT id, name, price
    FROM products
    WHERE active = 1
    ORDER BY name
  `);
}

// Load active custom options grouped by type
async function getOptionsByType() {
  const rows = await q(`
    SELECT id, type, name, price_extra
    FROM custom_options
    WHERE active = 1
    ORDER BY type, name
  `);
  const out = {};
  for (const r of rows) {
    if (!out[r.type]) out[r.type] = [];
    out[r.type].push(r);
  }
  return out;
}

// 🖌 GET /custom_cake — render page with data
router.get("/", async (req, res) => {
  try {
    const [cakes, optionsByType] = await Promise.all([
      getBaseCakes(),
      getOptionsByType()
    ]);
    res.render("custom_cake", { cakes, optionsByType });
  } catch (e) {
    console.error("custom_cake load:", e);
    res.render("custom_cake", { cakes: [], optionsByType: {} });
  }
});

/**
 * 🧁 POST /custom_cake/create
 * Creates a row in custom_cake_orders (+ options) and drops a line into cart_items.
 * Body expects:
 * - product_id
 * - quantity
 * - notes (optional)
 * - option_ids (array OR single value)
 */
router.post("/create", async (req, res) => {
  try {
    let { product_id, quantity, notes, option_ids } = req.body;

    // normalize
    product_id = Number(product_id);
    quantity = Math.max(parseInt(quantity || "1", 10), 1);
    let optionIds = [];
    if (Array.isArray(option_ids)) optionIds = option_ids.filter(Boolean).map(Number);
    else if (option_ids) optionIds = [Number(option_ids)];

    // 1) Base cake
    const baseRows = await q("SELECT id, name, price FROM products WHERE id=? AND active=1", [product_id]);
    if (!baseRows.length) return res.json({ success: false, error: "Base cake not found" });
    const base = baseRows[0];

    // 2) Options + compute price (server-side!)
    let optSum = 0;
    if (optionIds.length) {
      const placeholders = optionIds.map(() => "?").join(",");
      const opts = await q(
        `SELECT id, price_extra FROM custom_options WHERE id IN (${placeholders}) AND active=1`,
        optionIds
      );
      optSum = opts.reduce((s, o) => s + Number(o.price_extra || 0), 0);
    }
    const unitPrice = Number((Number(base.price) + optSum).toFixed(2));
    const snapshotName = `${base.name} Custom Cake`;

    // 3) Insert into custom_cake_orders
    // NOTE: your schema shows "base price" (with a space). Please ensure the column is actually `base_price`.
    const ins = await q(
      "INSERT INTO custom_cake_orders (product_id, name, name_snapshot, notes, base_price, total_price, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [base.id, snapshotName, snapshotName, notes || null, Number(base.price), unitPrice]
    );
    const customOrderId = ins.insertId;

    // 4) Options mapping
    if (optionIds.length) {
      const values = optionIds.map(oid => [customOrderId, oid]);
      await q("INSERT INTO custom_cake_order_options (custom_cake_order_id, option_id) VALUES ?", [values]);
    }

    // 5) Ensure cart (user or guest)
    let cart;
    if (req.session.user) {
      cart = await getCurrentCart(req.session.user.id, null);
    } else {
      if (!req.session.guestId) {
        req.session.guestId = "guest_" + Math.random().toString(36).slice(2);
      }
      cart = await getCurrentCart(null, req.session.guestId);
    }

    // 6) Add to cart_items (custom line)
    await addItemToCart(cart.id, {
      product_id: null,
      product_name: snapshotName,
      price: unitPrice,
      quantity,
      custom_cake_order_id: customOrderId,
      meta: JSON.stringify({ product_id: base.id, option_ids: optionIds, notes: notes || "" })
    });

    return res.json({ success: true, custom_cake_order_id: customOrderId });
  } catch (e) {
    console.error("custom_cake create:", e);
    return res.json({ success: false, error: "Server error creating custom cake" });
  }
});

module.exports = router;
