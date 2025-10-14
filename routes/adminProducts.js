const express = require("express");
const router = express.Router();
const conn = require("../dbConfig");
const { isAdmin } = require("../middleware/auth");

// ⬇️ NEW: image upload deps
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ⬇️ NEW: ensure /public/images/products exists
const uploadDir = path.join(__dirname, "..", "public", "images", "products");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ⬇️ NEW: Multer storage + guards (5MB, images only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginal = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  }
});

// Show all products
router.get("/", isAdmin, (req, res) => {
  const queryActive = "SELECT * FROM products WHERE active = 1";
  const queryArchived = "SELECT * FROM products WHERE active = 0";
  const queryCategories = "SELECT * FROM product_category";

  conn.query(queryCategories, (err, categoryResults) => {
    if (err) throw err;
    conn.query(queryActive, (err2, activeResults) => {
      if (err2) throw err2;
      conn.query(queryArchived, (err3, archivedResults) => {
        if (err3) throw err3;

        res.render("adminProducts", {
          products: activeResults,
          archivedProducts: archivedResults,
          categories: categoryResults
        });
      });
    });
  });
});

// Add new product (saves image to disk and path to image_url)
router.post("/add", isAdmin, upload.single("image_file"), (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  const imageUrl = req.file ? `/images/products/${req.file.filename}` : null;

  const sql = `
    INSERT INTO products (name, description, price, stock, category_id, image_url, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `;
  conn.query(
    sql,
    [name, description, price, stock, category_id, imageUrl],
    (err) => {
      if (err) throw err;
      res.redirect("/admin/Products");
    }
  );
});

// Update product
// If a new file is uploaded, update image_url; otherwise leave it unchanged.
router.post("/update/:id", isAdmin, upload.single("image_file"), (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  const { id } = req.params;

  if (req.file) {
    const imageUrl = `/images/products/${req.file.filename}`;
    const sql = `
      UPDATE products
      SET name=?, description=?, price=?, stock=?, category_id=?, image_url=?
      WHERE id=?
    `;
    conn.query(
      sql,
      [name, description, price, stock, category_id, imageUrl, id],
      (err) => {
        if (err) throw err;
        res.redirect("/admin/Products");
      }
    );
  } else {
    const sql = `
      UPDATE products
      SET name=?, description=?, price=?, stock=?, category_id=?
      WHERE id=?
    `;
    conn.query(
      sql,
      [name, description, price, stock, category_id, id],
      (err) => {
        if (err) throw err;
        res.redirect("/admin/Products");
      }
    );
  }
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
