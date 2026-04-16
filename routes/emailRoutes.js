/**
 * routes/emailRoutes.js
 * All email-related API endpoints.
 * All routes are protected by isAuthenticated middleware.
 */
const express = require('express');
const {
  sendEmail,
  getInbox,
  getSent,
  markRead,
  getThread,
} = require('../controllers/emailController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Protect all email routes
router.use(isAuthenticated);

router.post('/send',              sendEmail);   // SMTP simulation
router.get('/inbox',              getInbox);    // POP3 simulation
router.get('/sent',               getSent);     // Sent box
router.patch('/:id/read',         markRead);    // Mark as read
router.get('/thread/:threadId',   getThread);   // Email thread

module.exports = router;
