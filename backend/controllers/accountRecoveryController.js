const crypto = require("crypto");
const User = require("../models/User");
const { sendEmailVerification, sendPasswordReset } = require("../services/emailService");
const { validatePasswordChangeInput } = require("../utils/validators");

const generateTokenAndHash = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findUserByEmail(email);

    // Generic response to prevent email enumeration
    if (!user || user.email_verified_at) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered and unverified, a verification link has been sent.",
      });
    }

    const { rawToken, tokenHash } = generateTokenAndHash();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await User.setVerificationToken(user.id, tokenHash, expiresAt);
    await sendEmailVerification(user.email, user.first_name, rawToken);

    return res.status(200).json({
      success: true,
      message: "If the email is registered and unverified, a verification link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Invalid or missing token." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findUserByVerificationToken(tokenHash);

    if (!user || new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token.",
      });
    }

    if (user.email_verified_at) {
       return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    await User.verifyEmail(user.id);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findUserByEmail(email);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive a password reset link.",
      });
    }

    const { rawToken, tokenHash } = generateTokenAndHash();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await User.setResetToken(user.email, tokenHash, expiresAt);
    await sendPasswordReset(user.email, rawToken);

    return res.status(200).json({
      success: true,
      message: "If your email is registered, you will receive a password reset link.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: "Token and new password are required." });
    }

    // Since we only change password, we pass new_password as both current and new for validation's strength check,
    // although we should just use validatePasswordStrength. We'll use the existing one but fake current_password to pass validation structure.
    const { valid, errors } = validatePasswordChangeInput({ current_password: "fake", new_password });
    if (!valid) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findUserByResetToken(tokenHash);

    if (!user || new Date(user.password_reset_expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    await User.updatePassword(user.id, new_password);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  generateTokenAndHash, // exported for use in authController register
};
