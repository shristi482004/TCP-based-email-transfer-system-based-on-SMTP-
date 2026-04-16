/**
 * routes/authRoutes.js
 * Google OAuth routes and session management.
 */
const express = require('express');
const passport = require('passport');
const { logout, getMe } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Redirect user to Google login page
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google redirects back here with auth code
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/?error=auth_failed',
  }),
  (req, res) => {
    // Success — redirect to dashboard
    res.redirect('/dashboard');
  }
);

// Logout and destroy session
router.get('/logout', logout);

// Get current user info (used by frontend JS)
router.get('/me', isAuthenticated, getMe);

module.exports = router;
