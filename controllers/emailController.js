/**
 * controllers/emailController.js
 *
 * Core email logic. Simulates SMTP and POP3 protocols:
 *
 * SMTP Simulation (sendEmail):
 *   Step 1 — QUEUED:    Email document created in DB
 *   Step 2 — HELO:      Server "greets" itself (logged)
 *   Step 3 — MAIL FROM: Validates sender
 *   Step 4 — RCPT TO:   Validates recipient
 *   Step 5 — DATA:      Writes message body
 *   Step 6 — QUIT:      Marks as DELIVERED
 *   → Each step updates smtpState in MongoDB
 *   → Processing happens async AFTER response is sent to client
 *
 * POP3 Simulation (getInbox):
 *   → Queries all emails where `to` = logged-in user's email
 *   → Returns sorted by newest first (simulates POP3 RETR)
 */
const Email = require('../models/Email');

// ─── SMTP Simulation (async, non-blocking) ────────────────────────────────────

/**
 * Simulates the SMTP handshake for a given email document.
 * Runs entirely in the background — client never waits for this.
 */
const simulateSMTP = async (emailDoc, fromName) => {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // HELO — server greeting
    await delay(100);
    await Email.findByIdAndUpdate(emailDoc._id, { smtpState: 'HELO' });
    console.log(`[SMTP] HELO mailsim.local`);

    // MAIL FROM
    await delay(100);
    await Email.findByIdAndUpdate(emailDoc._id, { smtpState: 'MAIL_FROM' });
    console.log(`[SMTP] MAIL FROM:<${emailDoc.from}>`);

    // RCPT TO
    await delay(100);
    await Email.findByIdAndUpdate(emailDoc._id, { smtpState: 'RCPT_TO' });
    console.log(`[SMTP] RCPT TO:<${emailDoc.to}>`);

    // DATA
    await delay(150);
    await Email.findByIdAndUpdate(emailDoc._id, { smtpState: 'DATA' });
    console.log(`[SMTP] DATA — Subject: ${emailDoc.subject}`);

    // QUIT → DELIVERED
    await delay(100);
    await Email.findByIdAndUpdate(emailDoc._id, {
      smtpState: 'DELIVERED',
      fromName: fromName,
    });
    console.log(`[SMTP] QUIT — Email delivered to ${emailDoc.to} `);
  } catch (err) {
    await Email.findByIdAndUpdate(emailDoc._id, { smtpState: 'FAILED' });
    console.error(`[SMTP] FAILED for email ${emailDoc._id}:`, err.message);
  }
};

// POST /email/send
const sendEmail = async (req, res) => {
  try {
    const { to, subject, message, replyTo } = req.body;

    // Basic validation
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Fields `to`, `subject`, `message` are required.' });
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid recipient email address.' });
    }

    // Determine thread: if replying, inherit threadId, else start new thread
    let threadId = null;
    if (replyTo) {
      const parent = await Email.findById(replyTo);
      threadId = parent?.threadId || parent?._id || null;
    }

    // Create email record (QUEUED state)
    const emailDoc = await Email.create({
      from: req.user.email,
      fromName: req.user.name,
      to: to.toLowerCase().trim(),
      subject,
      message,
      smtpState: 'QUEUED',
      threadId,
      replyTo: replyTo || null,
    });

    // Respond immediately — don't make client wait
    res.status(202).json({
      success: true,
      message: 'Email queued for delivery.',
      emailId: emailDoc._id,
    });

    // Fire-and-forget SMTP simulation (runs in background)
    simulateSMTP(emailDoc, req.user.name).catch((err) =>
      console.error('[SMTP background error]', err)
    );
  } catch (err) {
    console.error('[sendEmail error]', err);
    res.status(500).json({ error: 'Server error while sending email.' });
  }
};

// ─── POP3 Simulation ──────────────────────────────────────────────────────────

// GET /email/inbox  — returns emails for logged-in user
const getInbox = async (req, res) => {
  try {
    const emails = await Email.find({ to: req.user.email })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[POP3] RETR — ${emails.length} messages for ${req.user.email}`);
    res.json({ emails });
  } catch (err) {
    console.error('[getInbox error]', err);
    res.status(500).json({ error: 'Could not fetch inbox.' });
  }
};

// GET /email/sent — emails sent by logged-in user
const getSent = async (req, res) => {
  try {
    const emails = await Email.find({ from: req.user.email })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ emails });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch sent emails.' });
  }
};

// PATCH /email/:id/read — mark email as read
const markRead = async (req, res) => {
  try {
    const email = await Email.findOneAndUpdate(
      { _id: req.params.id, to: req.user.email },
      { read: true },
      { new: true }
    );
    if (!email) return res.status(404).json({ error: 'Email not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update email.' });
  }
};

// GET /email/thread/:threadId — get all emails in a thread
const getThread = async (req, res) => {
  try {
    const emails = await Email.find({ threadId: req.params.threadId })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ emails });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch thread.' });
  }
};

module.exports = { sendEmail, getInbox, getSent, markRead, getThread };
