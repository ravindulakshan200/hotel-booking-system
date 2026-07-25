const nodemailer = require('nodemailer');

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sendBookingConfirmation = async (userEmail, userName, bookingDetails) => {
  if (process.env.NODE_ENV === 'test') {
    return true; // Skip in tests
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email Mock] Would send booking confirmation to ${userEmail} for booking #${bookingDetails.id}`);
    return true;
  }

  const transporter = getTransporter();
  const safeName = escapeHtml(userName);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${safeName},</p>
        <p>Thank you for your booking. We are thrilled to host you!</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0d6efd;">Booking Details</h3>
          <p><strong>Booking ID:</strong> #${bookingDetails.id}</p>
          <p><strong>Check-in:</strong> ${new Date(bookingDetails.check_in).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(bookingDetails.check_out).toLocaleDateString()}</p>
          <p><strong>Total Price:</strong> LKR ${bookingDetails.total_price}</p>
        </div>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br/>The Hotel Booking System Team</p>
      </div>
      <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        &copy; ${new Date().getFullYear()} Hotel Booking System
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Booking Confirmation #${bookingDetails.id}`,
    html: htmlContent,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), 5000)
    );
    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

const sendEmailVerification = async (userEmail, userName, rawToken) => {
  if (process.env.NODE_ENV === 'test') {
    return true; // Skip in tests
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationLink = `${frontendUrl}/verify-email/${rawToken}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email Mock] Verification link for ${userEmail}: ${verificationLink}`);
    return true;
  }

  const transporter = getTransporter();
  const safeName = escapeHtml(userName);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Verify Your Email</h1>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${safeName},</p>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Verify Your Email`,
    html: htmlContent,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 5000));
    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

const sendPasswordReset = async (userEmail, rawToken) => {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password/${rawToken}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email Mock] Password reset link for ${userEmail}: ${resetLink}`);
    return true;
  }

  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
      </div>
      <div style="padding: 20px;">
        <p>We received a request to reset the password for your account.</p>
        <p>Click the button below to choose a new password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Password Reset Request`,
    html: htmlContent,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 5000));
    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendEmailVerification,
  sendPasswordReset,
};
