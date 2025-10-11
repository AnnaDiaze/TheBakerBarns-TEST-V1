const express = require('express');
const router = express.Router();
const conn = require("../dbConfig");
const {isAdmin} = require("../middleware/auth");

// Admin Landing Page
router.get('/', isAdmin, (req, res) => {
  res.render('adminOnly', { username: "Anuradha" }); 
});

module.exports = router;