// reusable middleware to check if user is an admin
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

// reusable middleware to check if user is logged in (any role)
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next(); // user is logged in
  } else {
    res.render('custom_cake/create', { message: 'Please login to customize a cake' });
  }
}

// export both middleware
module.exports = { isAdmin, isLoggedIn };
