//reusable middleware to check if user is an admin.
// middleware/auth.js
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.redirect("/login");
}
module.exports = isAdmin;