/**
 * config/passport.js
 * Configures Passport.js with Google OAuth 2.0 strategy.
 * On login: finds or creates user in MongoDB.
 * serializeUser/deserializeUser manages session storage.
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Try to find existing user
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // First time login — create user record
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value || '',
          });
          console.log(`👤 New user created: ${user.email}`);
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Store only user ID in session cookie
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Retrieve full user object from DB on each request
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
