const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');




// Recipe list page
router.get('/recipes', (req, res) => {
  conn.query('SELECT * FROM recipes ORDER BY created_at DESC', (err, results) => {
    if (err) throw err;
    res.render('recipes', { recipes: results });
  });
});

// Single recipe page
router.get('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;
  conn.query('SELECT * FROM recipes WHERE id = ?', [recipeId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.status(404).send('Recipe not found');
    res.render('recipeDetail', { recipe: results[0] });
  });
});

module.exports = router;