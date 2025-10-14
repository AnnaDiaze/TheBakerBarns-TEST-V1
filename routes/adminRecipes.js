// routes/adminRecipes.js
const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');
const { isAdmin } = require("../middleware/auth");

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Save to public/images/recipe
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'recipe');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

// Show all recipes
router.get("/", isAdmin, (req, res) => {
  conn.query('SELECT * FROM recipes', (err, results) => {
    if (err) throw err;
    res.render('adminRecipes', { recipes: results });
  });
});

// Add recipe (multipart)
router.post("/add", isAdmin, upload.single('image_file'), (req, res) => {
  const { title, description, ingredients, method } = req.body;
  const image = req.file ? `/images/recipe/${req.file.filename}` : (req.body.image || '');
  conn.query(
    'INSERT INTO recipes (title, description, ingredients, method, image) VALUES (?, ?, ?, ?, ?)',
    [title, description, ingredients, method, image],
    (err) => {
      if (err) throw err;
      res.redirect('/admin/Recipes');
    }
  );
});

// Update recipe (multipart)
router.post("/update/:id", isAdmin, upload.single('image_file'), (req, res) => {
  const id = req.params.id;
  const { title, description, ingredients, method } = req.body;
  const image = req.file ? `/images/recipe/${req.file.filename}` : (req.body.image || '');
  conn.query(
    'UPDATE recipes SET title=?, description=?, ingredients=?, method=?, image=? WHERE id=?',
    [title, description, ingredients, method, image, id],
    (err) => {
      if (err) throw err;
      res.redirect('/admin/Recipes');
    }
  );
});

router.get("/delete/:id", isAdmin, (req, res) => {
  conn.query('DELETE FROM recipes WHERE id = ?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/Recipes');
  });
});

module.exports = router;
