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

const buildEmailTemplate = (event) => {
  const { event_type, recipient_email, payload } = event;
  const safeName = escapeHtml(payload.userName || "Customer");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  let subject = "";
  let htmlContent = "";
  let textContent = "";

  const baseTemplate = (title, color, bodyHtml, bodyText) => {
    return {
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </div>
          <div style="padding: 20px;">
            ${bodyHtml}
            <p>Best regards,<br/>The Hotel Booking System Team</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} Hotel Booking System
          </div>
        </div>
      `,
      text: `${title}\n\n${bodyText}\n\nBest regards,\nThe Hotel Booking System Team`
    };
  };

  switch (event_type) {
    case 'email_verification_requested': {
      subject = "Verify Your Email";
      const verificationLink = `${frontendUrl}/verify-email/${payload.rawToken}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nPlease verify your email by visiting: ${verificationLink}\nThis link will expire in 24 hours.`;
      const template = baseTemplate(subject, "#0d6efd", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'password_reset_requested': {
      subject = "Password Reset Request";
      const resetLink = `${frontendUrl}/reset-password/${payload.rawToken}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>We received a request to reset the password for your account.</p>
        <p>Click the button below to choose a new password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nReset your password by visiting: ${resetLink}\nIf you didn't request this, safely ignore it.`;
      const template = baseTemplate(subject, "#dc3545", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'booking_created': {
      subject = `Booking Created #${payload.bookingId}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>Your booking has been created and is awaiting payment.</p>
        <p><strong>Booking ID:</strong> #${payload.bookingId}</p>
        <p><strong>Check-in:</strong> ${payload.checkIn}</p>
        <p><strong>Check-out:</strong> ${payload.checkOut}</p>
        <p>Please complete your payment to confirm the reservation.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nBooking #${payload.bookingId} created. Please complete payment to confirm.`;
      const template = baseTemplate("Booking Created", "#ffc107", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'booking_confirmed': {
      subject = `Booking Confirmation #${payload.bookingId}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>Thank you for your booking. We are thrilled to host you!</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0d6efd;">Booking Details</h3>
          <p><strong>Booking ID:</strong> #${payload.bookingId}</p>
          <p><strong>Check-in:</strong> ${payload.checkIn}</p>
          <p><strong>Check-out:</strong> ${payload.checkOut}</p>
          <p><strong>Total Price:</strong> LKR ${payload.totalPrice}</p>
        </div>
      `;
      const bodyText = `Dear ${safeName},\n\nBooking #${payload.bookingId} Confirmed!\nCheck-in: ${payload.checkIn}\nCheck-out: ${payload.checkOut}`;
      const template = baseTemplate("Booking Confirmed!", "#0d6efd", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'booking_cancelled': {
      subject = `Booking Cancelled #${payload.bookingId}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>Your booking #${payload.bookingId} has been successfully cancelled.</p>
        <p>We hope to host you again in the future.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nYour booking #${payload.bookingId} has been cancelled.`;
      const template = baseTemplate("Booking Cancelled", "#6c757d", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'refund_required': {
      subject = `Refund Pending for Cancelled Booking #${payload.bookingId}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>Your booking #${payload.bookingId} has been cancelled.</p>
        <p>Because you had completed payment for this booking, a manual refund is currently pending. Our team will process it shortly.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nBooking #${payload.bookingId} cancelled. A manual refund is pending.`;
      const template = baseTemplate("Refund Pending", "#fd7e14", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    case 'refund_completed': {
      subject = `Refund Completed for Booking #${payload.bookingId}`;
      const bodyHtml = `
        <p>Dear ${safeName},</p>
        <p>The refund for your cancelled booking #${payload.bookingId} has been successfully processed.</p>
        <p>Please allow a few business days for the funds to appear in your account.</p>
      `;
      const bodyText = `Dear ${safeName},\n\nThe refund for booking #${payload.bookingId} is completed.`;
      const template = baseTemplate("Refund Completed", "#198754", bodyHtml, bodyText);
      htmlContent = template.html;
      textContent = template.text;
      break;
    }
    default:
      throw new Error(`Unknown event_type: ${event_type}`);
  }

  return { subject, htmlContent, textContent };
};

const processEmailEvent = async (event) => {
  const { subject, htmlContent, textContent } = buildEmailTemplate(event);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email Mock Worker] Sent "${event.event_type}" to ${event.recipient_email} (Subject: ${subject})`);
    return true; // Simulate success
  }

  const transporter = getTransporter();
  const mailOptions = {
    from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
    to: event.recipient_email,
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), 10000)
    );
    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`Email sent: ${info.messageId} (Event ID: ${event.id})`);
    return true;
  } catch (error) {
    console.error(`[Email Worker Error] sending to ${event.recipient_email}:`, error.message);
    // Return false to let the worker retry instead of throwing unhandled exceptions
    return false;
  }
};

module.exports = {
  processEmailEvent,
};
