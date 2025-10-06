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

// Handle inline update form submission
router.post("/update/:id", isAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, email, phone, role } = req.body;

    const sql = 'UPDATE users SET user_name = ?, email = ?, phone = ?, role = ? WHERE user_id = ?';
    conn.query(sql, [username, email, phone, role, userId], (err) => {
        if (err) throw err;
        res.redirect('/admin/Users'); 
    });
});

// Delete users
router.get("/delete/:id", isAdmin, (req, res) => {
    conn.query('DELETE FROM users WHERE user_id = ?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/Users');
    });
});

module.exports = router;