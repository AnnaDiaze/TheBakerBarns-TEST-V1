const express = require('express');
const router = express.Router();
const conn = require('../dbConfig');

// Save contact message
router.post('/', (req, res) => {
  const { first_name, last_name, email, message } = req.body;

  const sql = `
    INSERT INTO contact_messages 
    (first_name, last_name, email, message, status, created_at, updated_at) 
    VALUES (?, ?, ?, ?, 'new', NOW(), NOW())
  `;

  conn.query(sql, [first_name, last_name, email, message], (err, result) => {
    if (err) {
      console.error("Error saving message:", err);
      return res.status(500).send("Database error");
    }
    console.log("Message saved with ID:", result.insertId);

    // Instead of redirect, render aboutus.ejs with success flag
    res.render('aboutus', { success: true });
  });
});

module.exports = router;