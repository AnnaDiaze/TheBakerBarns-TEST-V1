const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');
const isAdmin = require("../middleware/auth");

// Show all Users 
router.get("/", isAdmin, (req, res) => {
    conn.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;
    res.render('adminUsers', { users: results });
  });
});

// update ->"/update/:id", isAdmin,

// Delete users
router.get("/delete/:id", isAdmin, (req, res) => {
  conn.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
    if (err) throw err;
    res.redirect('/admin/Users');
  });
});

module.exports = router;