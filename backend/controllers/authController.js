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
const { validateRegisterInput, validateLoginInput } = require("../utils/validators");

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

    // ── 4. Fetch the newly created user (no password field) ──────────────────
    const newUser = await User.findUserById(newUserId);

    // ── 5. Generate JWT ──────────────────────────────────────────────────────
    const token = generateToken(newUser.id);

    // ── 6. Respond ───────────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: newUser,
      },
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

    // ── 6. Respond ───────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: safeUser,
      },
    });

  } catch (error) {
    next(error);
  }
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

    const hasAnyField = [first_name, last_name, phone].some(
      (v) => v !== undefined && v !== null
    );

    if (!hasAnyField) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update (first_name, last_name, phone).",
      });
    }

    if (first_name !== undefined && (!first_name || first_name.trim().length === 0)) {
      return res.status(400).json({ success: false, message: "first_name cannot be empty." });
    }

    if (last_name !== undefined && (!last_name || last_name.trim().length === 0)) {
      return res.status(400).json({ success: false, message: "last_name cannot be empty." });
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

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "current_password and new_password are required.",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "new_password must be at least 6 characters.",
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

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
