//reusable middleware to check if user is an admin.

function isAdmin(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === "admin") {
      return next();
    } else {
      return res.redirect("/"); // send regular users to homepage
    }
  }
  res.redirect("/login"); // not logged in at all
}

module.exports = isAdmin;