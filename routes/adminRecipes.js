const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');
const isAdmin = require("../middleware/auth");

// Show all recipes in admin
router.get("/", isAdmin, (req, res) => {
  // conn.query('SELECT * FROM recipes ORDER BY created_at DESC', (err, results) => {
    conn.query('SELECT * FROM recipes', (err, results) => {
    if (err) throw err;
    res.render('adminRecipes', { recipes: results });
  });
});

// Add recipe form
router.post("/add", isAdmin, (req, res) => {
  const { title, image, category, description, ingredients, method } = req.body;
  conn.query(
    'INSERT INTO recipes (title, description, ingredients, method, image) VALUES (?, ?, ?, ?, ?)',
    [title, description, ingredients, method, image],
    (err) => {
      if (err) throw err;
      res.redirect('/admin/Recipes');
    }
  );
});

// UPDATE
// Handle recipe update
router.post("/update/:id", isAdmin, (req, res) => {
  const recipeId = req.params.id;
  const { title, description, ingredients, method, image } = req.body;
  
  conn.query(
    'UPDATE recipes SET title = ?, description = ?, ingredients = ?, method = ?, image = ? WHERE id = ?',
    [title, description, ingredients, method, image, recipeId],
    (err) => {
      if (err) throw err;
      res.redirect('/admin/Recipes');
    }
  );
});


// Delete recipe
router.get("/delete/:id", isAdmin, (req, res) => {
  conn.query('DELETE FROM recipes WHERE id = ?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/Recipes');
  });
});

module.exports = router;