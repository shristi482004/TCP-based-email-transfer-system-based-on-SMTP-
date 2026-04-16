
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
