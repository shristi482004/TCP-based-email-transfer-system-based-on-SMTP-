/**
 * middleware/auth.js
 * Protects routes that require authentication.
 * If user is not logged in, returns 401 JSON for API routes.
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // API requests get JSON error; page requests get redirect
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  res.redirect('/');
};

module.exports = { isAuthenticated };
