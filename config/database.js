/**
 * config/database.js
 * Connects to MongoDB using the URI from .env
 * Called once at server startup.
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Kill server if DB fails
  }
};

module.exports = connectDB;
