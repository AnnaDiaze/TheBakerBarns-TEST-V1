// utils/cartHelper.js
const conn = require('../dbConfig');

// Get or create current open cart for a user
async function getCurrentCart(userId = null, guestId = null) {
  return new Promise((resolve, reject) => {
    const identifierField = userId ? 'user_id' : 'guest_id';
    const identifierValue = userId || guestId;

    if (!identifierValue) return reject(new Error("Missing both userId and guestId"));

    conn.query(
      `SELECT * FROM carts WHERE ${identifierField} = ? AND status = "open"`,
      [identifierValue],
      (err, carts) => {
        if (err) return reject(err);
        if (carts.length > 0) return resolve(carts[0]);

        // No open cart → create one
        conn.query(
          `INSERT INTO carts (${identifierField}, status, created_at) VALUES (?, "open", NOW())`,
          [identifierValue],
          (err2, result) => {
            if (err2) return reject(err2);
            resolve({ id: result.insertId, [identifierField]: identifierValue, status: 'open' });
          }
        );
      }
    );
  });
}

// Get all items in a cart
async function getCartItems(cartId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id AS item_id,
             product_id,
             custom_cake_order_id,
             name,
             price,
             quantity,
             meta
      FROM cart_items
      WHERE cart_id = ?
    `;
    conn.query(sql, [cartId], (err, items) => {
      if (err) return reject(err);
      resolve(items);
    });
  });
}

// Add item to cart (supports products or custom cakes)
async function addItemToCart(cartId, { product_id, product_name, price, quantity, custom_cake_order_id, meta }) {
  if (product_id && (!product_name || !price)) {
    const [rows] = await conn.promise().query("SELECT name, price FROM products WHERE id = ?", [product_id]);
    if (rows.length) {
      product_name = rows[0].name;
      price = rows[0].price;
    }
  }

  quantity = Number(quantity) || 1;
  price = Number(price) || 0;

  await conn.promise().query(
    `INSERT INTO cart_items 
     (cart_id, product_id, custom_cake_order_id, name, price, quantity, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [cartId, product_id, custom_cake_order_id, product_name, price, quantity, meta || null]
  );
}

// Update quantity of a cart item
async function updateCartItem(itemId, quantity) {
  return new Promise((resolve, reject) => {
    conn.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [quantity, itemId],
      (err) => {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

// Remove item from cart
async function removeCartItem(itemId) {
  return new Promise((resolve, reject) => {
    conn.query('DELETE FROM cart_items WHERE id = ?', [itemId], (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  getCurrentCart,
  getCartItems,
  addItemToCart,
  updateCartItem,
  removeCartItem
};
