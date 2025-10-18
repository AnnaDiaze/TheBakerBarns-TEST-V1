// routes/adminMessages.js
const express = require("express");
const router = express.Router();

const conn = require("../dbConfig");
const { isAdmin } = require("../middleware/auth");

// Whitelist status values to keep data clean
const VALID_STATUSES = new Set(["new", "read", "replied"]);

// LIST + FILTER
// mount this router at /admin/Messages (see hook-up note below)
router.get("/", isAdmin, (req, res) => {
  const { status, q } = req.query;

  const where = [];
  const params = [];

  if (status && VALID_STATUSES.has(status)) {
    where.push("status = ?");
    params.push(status);
  }

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where.push(`(
      first_name LIKE ? OR
      last_name LIKE ? OR
      email LIKE ? OR
      message LIKE ?
    )`);
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT message_id, first_name, last_name, email, message, status, updated_at
    FROM contact_messages
    ${whereSql}
    ORDER BY updated_at DESC, message_id DESC
  `;

  conn.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching contact_messages:", err);
      return res.status(500).send("Error loading messages");
    }

    res.render("adminMessages", {
      messages: rows || [],
      currentStatus: (status && VALID_STATUSES.has(status)) ? status : "",
      queryText: q || ""
    });
  });
});

// UPDATE STATUS (AJAX)
router.post("/update/:id", isAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ ok: false, error: "Invalid status" });
  }

  const sql = `
    UPDATE contact_messages
    SET status = ?, updated_at = NOW()
    WHERE message_id = ?
  `;

  conn.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating contact_messages.status:", err);
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Message not found" });
    }
    return res.json({ ok: true });
  });
});

module.exports = router;
