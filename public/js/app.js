/**
 * public/js/app.js
 *
 * Frontend logic for MailSim dashboard.
 * Handles: panel switching, email compose/send, inbox/sent loading,
 * email viewing, reply/forward, SMTP trace animation.
 */

// ── State ──────────────────────────────────────────────────────────────────
let currentUser    = null;
let currentEmail   = null;  // email open in modal
let inboxEmails    = [];
let sentEmails     = [];

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await loadInbox();
  // Poll inbox every 30s for new messages
  setInterval(loadInbox, 30000);
});

// ── Load current user ──────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res  = await fetch('/auth/me');
    if (!res.ok) { window.location.href = '/'; return; }
    currentUser = await res.json();

    document.getElementById('userName').textContent = currentUser.name;

    const avatarEl = document.getElementById('userAvatar');
    if (currentUser.avatar) {
      avatarEl.outerHTML = `<img id="userAvatar" class="user-avatar" src="${currentUser.avatar}" alt="${currentUser.name}" />`;
    } else {
      avatarEl.textContent = currentUser.name[0].toUpperCase();
    }
  } catch {
    window.location.href = '/';
  }
}

// ── Panel Switching ────────────────────────────────────────────────────────
function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`panel-${name}`).classList.add('active');
  document.querySelector(`[data-panel="${name}"]`).classList.add('active');

  if (name === 'inbox') loadInbox();
  if (name === 'sent')  loadSent();
  if (name === 'compose') resetCompose();
}

// ── Load Inbox (POP3 simulation) ───────────────────────────────────────────
async function loadInbox() {
  try {
    const res  = await fetch('/email/inbox');
    if (!res.ok) throw new Error('Failed to fetch inbox');
    const data = await res.json();
    inboxEmails = data.emails;

    const unread = inboxEmails.filter(e => !e.read).length;
    const badge  = document.getElementById('unreadBadge');
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline' : 'none';

    renderEmailList('inboxList', inboxEmails, 'inbox');
  } catch (err) {
    showToast('Could not load inbox: ' + err.message, 'error');
  }
}

// ── Load Sent ──────────────────────────────────────────────────────────────
async function loadSent() {
  try {
    const res  = await fetch('/email/sent');
    if (!res.ok) throw new Error('Failed to fetch sent');
    const data = await res.json();
    sentEmails = data.emails;
    renderEmailList('sentList', sentEmails, 'sent');
  } catch (err) {
    showToast('Could not load sent: ' + err.message, 'error');
  }
}

// ── Render Email List ──────────────────────────────────────────────────────
function renderEmailList(containerId, emails, type) {
  const container = document.getElementById(containerId);

  if (!emails.length) {
    container.innerHTML = `
      <div class="email-list-empty">
        <div class="empty-icon">${type === 'inbox' ? '📭' : '📤'}</div>
        <div class="empty-text">${type === 'inbox' ? 'Your inbox is empty' : 'No sent emails yet'}</div>
      </div>`;
    return;
  }

  container.innerHTML = emails.map(email => {
    const isUnread = !email.read && type === 'inbox';
    const time     = formatTime(email.createdAt);
    const sender   = type === 'inbox'
      ? (email.fromName || email.from)
      : `To: ${email.to}`;

    const smtpBadge = type === 'sent' ? `
      <span class="smtp-status smtp-${email.smtpState === 'DELIVERED' ? 'delivered' : email.smtpState === 'FAILED' ? 'failed' : 'progress'}">
        <span class="smtp-dot"></span>
        ${email.smtpState}
      </span>` : '';

    return `
      <div class="email-item ${isUnread ? 'unread' : ''}"
           onclick="openEmail('${email._id}', '${type}')">
        <div>
          <div class="email-sender">${escHtml(sender)}</div>
          <div class="email-subject">${isUnread ? '● ' : ''}${escHtml(email.subject)}</div>
          <div class="email-preview">${escHtml(email.message.slice(0, 80))}...</div>
          ${smtpBadge}
        </div>
        <div class="email-time">${time}</div>
      </div>`;
  }).join('');
}

// ── Open Email in Modal ────────────────────────────────────────────────────
async function openEmail(id, type) {
  const emails = type === 'inbox' ? inboxEmails : sentEmails;
  currentEmail = emails.find(e => e._id === id);
  if (!currentEmail) return;

  // Mark as read
  if (type === 'inbox' && !currentEmail.read) {
    fetch(`/email/${id}/read`, { method: 'PATCH' });
    currentEmail.read = true;
    loadInbox(); // refresh badge
  }

  // Populate modal
  document.getElementById('modalSubject').textContent = currentEmail.subject;
  document.getElementById('modalFrom').textContent    = `${currentEmail.fromName || ''} <${currentEmail.from}>`;
  document.getElementById('modalTo').textContent      = currentEmail.to;
  document.getElementById('modalDate').textContent    = new Date(currentEmail.createdAt).toLocaleString();
  document.getElementById('modalBody').textContent    = currentEmail.message;

  const smtpClass = currentEmail.smtpState === 'DELIVERED' ? 'smtp-delivered'
                  : currentEmail.smtpState === 'FAILED'    ? 'smtp-failed'
                  : 'smtp-progress';
  document.getElementById('modalSmtpStatus').innerHTML =
    `<span class="smtp-status ${smtpClass}"><span class="smtp-dot"></span>${currentEmail.smtpState}</span>`;

  // Reset reply box
  document.getElementById('replyBox').classList.remove('open');
  document.getElementById('replyMessage').value = '';

  document.getElementById('emailModal').classList.add('open');
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('open');
  currentEmail = null;
}

function closeModal(e) {
  if (e.target.id === 'emailModal') closeEmailModal();
}

// ── Reply ──────────────────────────────────────────────────────────────────
function openReply() {
  document.getElementById('replyBox').classList.toggle('open');
}

async function sendReply() {
  const message = document.getElementById('replyMessage').value.trim();
  if (!message || !currentEmail) return;

  const payload = {
    to:      currentEmail.from,
    subject: `Re: ${currentEmail.subject}`,
    message,
    replyTo: currentEmail._id,
  };

  const res = await sendEmailPayload(payload);
  if (res.success) {
    showToast('Reply sent!', 'success');
    document.getElementById('replyBox').classList.remove('open');
    document.getElementById('replyMessage').value = '';
  }
}

// ── Forward ────────────────────────────────────────────────────────────────
function openForward() {
  if (!currentEmail) return;
  closeEmailModal();
  switchPanel('compose');
  document.getElementById('composeSubject').value = `Fwd: ${currentEmail.subject}`;
  document.getElementById('composeMessage').value =
    `\n\n--- Forwarded message ---\nFrom: ${currentEmail.from}\nSubject: ${currentEmail.subject}\n\n${currentEmail.message}`;
}

// ── Send Email (SMTP Simulation) ───────────────────────────────────────────
async function sendEmail() {
  const to      = document.getElementById('composeTo').value.trim();
  const subject = document.getElementById('composeSubject').value.trim();
  const message = document.getElementById('composeMessage').value.trim();
  const replyTo = document.getElementById('composeReplyTo').value;

  if (!to || !subject || !message) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  // Disable send button immediately — no UI freeze
  const btn     = document.getElementById('sendBtn');
  const btnText = document.getElementById('sendBtnText');
  const spinner = document.getElementById('sendBtnSpinner');
  btn.disabled    = true;
  btnText.textContent = 'SENDING...';
  spinner.style.display = 'inline-block';

  // Show SMTP trace animation
  showSmtpTrace();

  const res = await sendEmailPayload({ to, subject, message, replyTo });

  // Restore button
  btn.disabled = false;
  btnText.textContent = 'SEND MESSAGE';
  spinner.style.display = 'none';

  if (res.success) {
    showToast('📨 Email queued for delivery!', 'success');
    resetCompose();
    loadSent();
  } else {
    showToast(res.error || 'Failed to send.', 'error');
  }
}

async function sendEmailPayload(payload) {
  try {
    const res = await fetch('/email/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { error: 'Network error.' };
  }
}

// ── SMTP Trace Animation ───────────────────────────────────────────────────
function showSmtpTrace() {
  const trace = document.getElementById('smtpTrace');
  trace.classList.add('visible');
  trace.innerHTML = '';

  const steps = [
    '220 mailsim.local SMTP Service Ready',
    '→ HELO mailsim.local',
    '250 Hello, pleased to meet you',
    `→ MAIL FROM:<${currentUser?.email || 'you'}>`,
    '250 Sender OK',
    `→ RCPT TO:<${document.getElementById('composeTo').value}>`,
    '250 Recipient OK',
    '→ DATA',
    '354 Start mail input; end with <CRLF>.<CRLF>',
    '... [message body transmitted]',
    '250 Message queued for delivery ✓',
    '→ QUIT',
    '221 Bye — connection closed',
  ];

  steps.forEach((line, i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'trace-line';
      el.style.animationDelay = '0ms';
      el.textContent = line;
      trace.appendChild(el);
      trace.scrollTop = trace.scrollHeight;
    }, i * 120);
  });
}

function resetCompose() {
  document.getElementById('composeTo').value      = '';
  document.getElementById('composeSubject').value = '';
  document.getElementById('composeMessage').value = '';
  document.getElementById('composeReplyTo').value = '';
  const trace = document.getElementById('smtpTrace');
  trace.classList.remove('visible');
  trace.innerHTML = '';
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;

  if (diff < 60000)        return 'just now';
  if (diff < 3600000)      return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)     return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000)    return d.toLocaleDateString([], { month:'short', day:'numeric' });
  return d.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
