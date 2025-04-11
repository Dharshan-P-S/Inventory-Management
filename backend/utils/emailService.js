const nodemailer = require('nodemailer');

// Configure the transporter using environment variables or hardcoded values (less secure)
// Ensure you have enabled "Less secure app access" in Gmail or use an App Password if 2FA is enabled.
// Trying port 587 with STARTTLS instead of 465
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Explicit host
  port: 587, // Port for STARTTLS
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER || 'inventorymanagementfst@gmail.com', // Use environment variable
    pass: process.env.EMAIL_PASS || 'ubdo qrmh mbpy ekgd', // Use environment variable (App Password recommended)
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

/**
 * Sends a password reset OTP email.
 * @param {string} userEmail - The recipient's email address.
 * @param {string} otp - The One-Time Password.
 * @returns {Promise<boolean>} - True if email sent successfully, false otherwise.
 */
const sendPasswordResetOtp = async (userEmail, otp) => {
  const mailOptions = {
    from: `"Inventory Management" <${process.env.EMAIL_USER || 'inventorymanagementfst@gmail.com'}>`,
    to: userEmail,
    subject: 'Your Password Reset OTP',
    text: `Dear User,\n\nYou requested a password reset for your Inventory Management account.\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nThank you,\nThe Inventory Management Team`,
    html: `<p>Dear User,</p>
           <p>You requested a password reset for your Inventory Management account.</p>
           <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
           <p>This OTP is valid for 10 minutes.</p>
           <p>If you did not request this password reset, please ignore this email.</p>
           <p>Thank you,<br>The Inventory Management Team</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Password reset OTP email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending password reset OTP email to ${userEmail}:`, error);
    return false;
  }
};

/**
 * Sends a registration verification OTP email.
 * @param {string} userEmail - The recipient's email address.
 * @param {string} otp - The One-Time Password.
 * @returns {Promise<boolean>} - True if email sent successfully, false otherwise.
 */
const sendRegistrationOtp = async (userEmail, otp) => {
  const mailOptions = {
    from: `"Inventory Management" <${process.env.EMAIL_USER || 'inventorymanagementfst@gmail.com'}>`,
    to: userEmail,
    subject: 'Verify Your Email for Registration',
    text: `Dear User,\n\nThank you for registering with Inventory Management.\n\nYour email verification One-Time Password (OTP) is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nEnter this OTP in the registration form to complete your signup.\n\nIf you did not attempt to register, please ignore this email.\n\nThank you,\nThe Inventory Management Team`,
    html: `<p>Dear User,</p>
           <p>Thank you for registering with Inventory Management.</p>
           <p>Your email verification One-Time Password (OTP) is: <strong>${otp}</strong></p>
           <p>This OTP is valid for 10 minutes.</p>
           <p>Enter this OTP in the registration form to complete your signup.</p>
           <p>If you did not attempt to register, please ignore this email.</p>
           <p>Thank you,<br>The Inventory Management Team</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Registration OTP email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending registration OTP email to ${userEmail}:`, error);
    return false;
  }
};


module.exports = { sendPasswordResetOtp, sendRegistrationOtp };
