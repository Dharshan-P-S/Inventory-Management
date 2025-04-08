const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Assuming a UUID will be generated
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  requestDate: { type: Date, default: Date.now } // Timestamp when the registration was requested
});

const PendingUser = mongoose.model('PendingUser', pendingUserSchema, 'pending_users'); // Explicitly set collection name

module.exports = PendingUser;
