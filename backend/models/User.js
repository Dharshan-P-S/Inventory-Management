const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Using the existing UUID
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  type: { type: String, required: true, enum: ['customer', 'owner'] }, // Ensure type is one of these values
  resetPasswordOtp: { type: String, required: false }, // Store the OTP
  resetPasswordExpires: { type: Date, required: false } // Store OTP expiry time
});

const User = mongoose.model('User', userSchema, 'users'); // Explicitly set collection name to 'users'

module.exports = User;
