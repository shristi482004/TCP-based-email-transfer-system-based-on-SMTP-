# TCP-based-email-transfer-system-based-on-SMTP-
This project implements a simplified version of SMTP using Python socket programming. A client establishes a TCP connection with the server and communicates using SMTP-like commands. The server processes these commands, validates the sequence, and stores the email content in a structured file system.
# MailSim — TCP Email Transfer System

A full-stack email system simulating SMTP and POP3 protocols with Google OAuth authentication and a neubrutalist frontend.

---

## Project Structure

```
mailsim/
├── config/
│   ├── database.js       # MongoDB connection
│   └── passport.js       # Google OAuth strategy
├── controllers/
│   ├── authController.js # Logout, get current user
│   └── emailController.js# SMTP simulation, POP3 inbox
├── middleware/
│   └── auth.js           # Protect routes (isAuthenticated)
├── models/
│   ├── User.js           # Google user schema
│   └── Email.js          # Email schema with SMTP state
├── routes/
│   ├── authRoutes.js     # /auth/*
│   └── emailRoutes.js    # /email/*
├── public/
│   ├── css/style.css     # Neubrutalist design system
│   ├── js/app.js         # Frontend logic
│   └── pages/
│       ├── login.html    # Login page
│       └── dashboard.html# Main app UI
├── server.js             # Express entry point
├── .env.example          # Environment variable template
├── .gitignore
└── package.json
```

---

## Setup Guide

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/mailsim.git
cd mailsim
npm install
```

### Step 2 — MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas and create a free account
2. Click **"Build a Database"** → choose **Free (M0)** tier
3. Choose a cloud provider and region → click **Create**
4. Under **"Security"** → **Database Access**: add a user with username/password
5. Under **"Security"** → **Network Access**: click **"Add IP Address"** → **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Under **"Deployment"** → **Database**: click **"Connect"** → **"Drivers"** → copy the connection string
7. Replace `<username>` and `<password>` in the connection string with your credentials

### Step 3 — Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Click **"Select a project"** → **"New Project"** → name it `mailsim` → **Create**
3. In the left menu: **APIs & Services** → **OAuth consent screen**
   - Choose **External** → **Create**
   - Fill in: App name (`MailSim`), User support email, Developer contact email
   - Click **Save and Continue** through all steps
   - Under **Test users**: add your own Gmail address
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `MailSim Web Client`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/auth/google/callback`
   - Click **Create** → copy the **Client ID** and **Client Secret**

### Step 4 — Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/mailsim?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=pick_any_long_random_string_here_abc123xyz
PORT=3000
APP_URL=http://localhost:3000
```

### Step 5 — Run

```bash
npm run dev     # development (auto-restart)
# or
npm start       # production
```

Open http://localhost:3000

---

## Deploying to Production (e.g. Render.com)

1. Push your code to GitHub (see below)
2. Go to https://render.com → **New Web Service** → connect your GitHub repo
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Add all environment variables from `.env` in the Render dashboard
6. Change `GOOGLE_CALLBACK_URL` to: `https://your-app.onrender.com/auth/google/callback`
7. In Google Cloud Console → Credentials → your OAuth client:
   - Add `https://your-app.onrender.com` to **Authorized JavaScript origins**
   - Add `https://your-app.onrender.com/auth/google/callback` to **Authorized redirect URIs**

---

## Pushing to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit — MailSim TCP email system"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/mailsim.git
git branch -M main
git push -u origin main
```

>  Make sure `.env` is in `.gitignore` — never push your secrets to GitHub.

---

## How the Protocol Simulations Work

### SMTP Simulation (sending)
When you click **Send**, the server:
1. Creates the email in MongoDB with state `QUEUED`
2. **Immediately** returns `202 Accepted` to the browser (no UI freeze)
3. In the background, steps through:
   - `HELO` → `MAIL FROM` → `RCPT TO` → `DATA` → `QUIT` → `DELIVERED`
4. Each step updates `smtpState` in MongoDB
5. The terminal trace in the UI animates these steps in real time

### POP3 Simulation (receiving)
When you open the Inbox, the server simulates:
- `STAT` — count messages
- `LIST` — enumerate message IDs
- `RETR` — retrieve all messages for your email address

### Async / Non-Blocking
- `sendEmail()` uses `async/await` with fire-and-forget background processing
- The UI shows **"SENDING..."** instantly, then updates when done
- The browser never freezes regardless of server processing time
