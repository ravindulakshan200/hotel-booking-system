/**
 * controllers/authController.js
 *
 * Handles all authentication HTTP requests.
 *
 * Routes:
 *   POST /api/v1/auth/register  — Create a new customer account
 *   POST /api/v1/auth/login     — Authenticate and receive a JWT
 *   GET  /api/v1/auth/profile   — Return the current user's profile (protected)
 *
 * All responses follow the unified format:
 *   Success: { success: true,  message: "...", data: { ... } }
 *   Failure: { success: false, message: "..." }
 */

const bcrypt       = require("bcryptjs");
const User         = require("../models/User");
const generateToken = require("../utils/generateToken");
const {
  validateRegisterInput,
  validateLoginInput,
  validateProfileInput,
  validatePasswordChangeInput,
} = require("../utils/validators");
const { generateTokenAndHash } = require("./accountRecoveryController");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Register a new customer account
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone } = req.body;

    // ── 1. Validate input ────────────────────────────────────────────────────
    const { valid, errors } = validateRegisterInput(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // ── 2. Check for duplicate email ─────────────────────────────────────────
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    // ── 3. Create the user (password hashed inside User.createUser) ──────────
    const newUserId = await User.createUser({
      first_name,
      last_name,
      email,
      password,
      phone,
    });

    // ── 4. Generate verification token and send email ────────────────────────
    const { rawToken, tokenHash } = generateTokenAndHash();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await User.setVerificationToken(newUserId, tokenHash, expiresAt);

    try {
      const EmailOutbox = require("../models/EmailOutbox");
      await EmailOutbox.enqueueEmailEvent(null, {
        eventKey: `email_verification_${newUserId}_${Date.now()}`,
        eventType: 'email_verification_requested',
        recipientUserId: newUserId,
        payload: {
          rawToken: rawToken
        },
        expiresAt
      });
    } catch (err) {
      console.error("Failed to enqueue email_verification_requested:", err.message);
    }

    // ── 5. Respond ───────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please verify your email.",
      data: null,
    });

  } catch (error) {
    next(error); // Delegate to global error handler
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Authenticate a user and return a JWT
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── 1. Validate input ────────────────────────────────────────────────────
    const { valid, errors } = validateLoginInput(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // ── 2. Look up user by email (includes hashed password) ──────────────────
    const user = await User.findUserByEmail(email);

    // Use a generic message to avoid revealing whether the email exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Block deactivated accounts
    if (user.is_active === 0 || user.is_active === false) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    if (!user.email_verified_at) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address.",
      });
    }

    // ── 3. Compare submitted password against stored bcrypt hash ─────────────
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── 4. Generate JWT ──────────────────────────────────────────────────────
    const token = generateToken(user.id);

    // ── 5. Build safe user object (exclude password) ─────────────────────────
    const { password: _pw, ...safeUser } = user;

    // ── 6. Set cookie ────────────────────────────────────────────────────────
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie("jwt", token, cookieOptions);

    // Generate CSRF token on login if they don't have one, or just rotate it
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, cookieOptions);

    // ── 7. Respond ───────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: safeUser,
        csrfToken
      },
    });

  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  const clearCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    expires: new Date(0),
  };
  res.cookie("jwt", "", clearCookieOptions);
  res.cookie("csrfToken", "", clearCookieOptions);
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

/**
 * @desc    Get CSRF Token
 * @route   GET /api/v1/auth/csrf-token
 * @access  Public
 */
const getCsrfToken = (req, res, next) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("csrfToken", csrfToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.status(200).json({
    success: true,
    message: "CSRF token generated",
    data: { csrfToken }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Return the authenticated user's profile
 * @route   GET /api/v1/auth/profile
 * @access  Private (requires valid JWT via authMiddleware)
 */
const getProfile = async (req, res, next) => {
  try {
    // req.user is populated by the protect middleware — already excludes password
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: {
        user: req.user,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Update the authenticated user's profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone } = req.body;

    const { valid, errors } = validateProfileInput(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    await User.updateProfile(req.user.id, { first_name, last_name, phone });
    const updatedUser = await User.findUserById(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change the authenticated user's password
 * @route   PUT /api/v1/auth/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const { valid, errors } = validatePasswordChangeInput(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    const user = await User.findUserByEmail(req.user.email);
    const isMatch = await bcrypt.compare(current_password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    await User.updatePassword(req.user.id, new_password);

    const isProd = process.env.NODE_ENV === "production";
    const clearCookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      expires: new Date(0),
    };
    res.cookie("jwt", "", clearCookieOptions);
    res.cookie("csrfToken", "", clearCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Self-deactivate account (password-confirmed)
 * @route   POST /api/v1/auth/deactivate
 * @access  Private
 */
const deactivateSelf = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required to confirm deactivation.' });
    }

    // Verify password
    const user = await User.findUserByEmail(req.user.email);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Guard: prevent deactivation if there are active bookings
    const pool = require('../config/db');
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM bookings
       WHERE user_id = ? AND booking_status IN ('pending','confirmed','checked_in')`,
      [req.user.id]
    );
    if (cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `You have ${cnt} active booking(s). Please cancel or complete them before deactivating your account.`,
      });
    }

    await User.deactivate(req.user.id, 'self');

    // Clear cookie immediately
    const isProd = process.env.NODE_ENV === "production";
    const clearCookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      expires: new Date(0),
    };
    res.cookie('jwt', '', clearCookieOptions);
    res.cookie('csrfToken', '', clearCookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Your account has been deactivated. You have been signed out.',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getCsrfToken, getProfile, updateProfile, changePassword, deactivateSelf };
