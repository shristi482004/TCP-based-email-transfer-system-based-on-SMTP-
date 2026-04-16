/**
 * server.js — Entry point
 *
 * Sets up Express, connects MongoDB, registers middleware and routes.
 * Serves frontend static files from /public.
 */
require('dotenv').config();

const express    = require('express');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const passport   = require('./config/passport');
const connectDB  = require('./config/database');
const authRoutes  = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session — stored in MongoDB so it survives server restarts
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/auth',  authRoutes);
app.use('/email', emailRoutes);

// ── Page Routes ───────────────────────────────────────────────────────────────
// Login page (root)
app.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
});

// Dashboard (protected)
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nMailSim running at http://localhost:${PORT}`);
  console.log(`   Login at: http://localhost:${PORT}/\n`);
});
