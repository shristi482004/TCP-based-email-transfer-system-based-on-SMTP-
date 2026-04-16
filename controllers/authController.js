/**
 * controllers/authController.js
 * Handles auth-related logic:
 * - logout: destroys session and redirects to login page
 * - getMe: returns the logged-in user's info as JSON (used by frontend)
 */
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
};

const getMe = (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar,
  });
};

module.exports = { logout, getMe };
