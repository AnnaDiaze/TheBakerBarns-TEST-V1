// dbConfig.js
const mysql = require("mysql2");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "thebakerbarns_test",
  port: 3306, // adjust if your MariaDB runs on 3307
});

conn.connect((err) => {
  if (err) throw err;
  console.log("✅ Database connected");
});

module.exports = conn;
