/**
 * models/Email.js
 * MongoDB schema for emails.
 * Stores all sent emails. Inbox is queried by `to` field.
 * threadId groups replies. read tracks unread status.
 */
const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema(
  {
    from:      { type: String, required: true },
    fromName:  { type: String, default: '' },
    to:        { type: String, required: true },
    subject:   { type: String, required: true },
    message:   { type: String, required: true },
    read:      { type: Boolean, default: false },
    threadId:  { type: mongoose.Schema.Types.ObjectId, default: null }, // for threading
    replyTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Email', default: null },

    // SMTP simulation state — tracks protocol steps internally
    smtpState: {
      type: String,
      enum: ['QUEUED', 'HELO', 'MAIL_FROM', 'RCPT_TO', 'DATA', 'QUIT', 'DELIVERED', 'FAILED'],
      default: 'QUEUED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Email', EmailSchema);
