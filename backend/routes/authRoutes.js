/**
 * routes/authRoutes.js
 *
 * Authentication routes — mounted at /api/v1/auth in server.js
 *
 * Public routes  (no token required):
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *
 * Protected routes (valid JWT required):
 *   GET  /api/v1/auth/profile
 */

const express  = require("express");
const router   = express.Router();

const { register, login, logout, getProfile, updateProfile, changePassword } = require("../controllers/authController");
const { forgotPassword, resetPassword, verifyEmail, resendVerification } = require("../controllers/accountRecoveryController");
const { protect }                     = require("../middleware/authMiddleware");
const { authLimiter, passwordResetLimiter, verificationLimiter } = require("../middleware/rateLimiters");

// ── Public ────────────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post("/register", authLimiter, register);

// POST /api/v1/auth/login
router.post("/login", authLimiter, login);

// POST /api/v1/auth/logout
router.post("/logout", authLimiter, logout);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", passwordResetLimiter, forgotPassword);

// POST /api/v1/auth/reset-password
router.post("/reset-password", passwordResetLimiter, resetPassword);

// GET /api/v1/auth/verify-email/:token
router.get("/verify-email/:token", verificationLimiter, verifyEmail);

// POST /api/v1/auth/resend-verification
router.post("/resend-verification", verificationLimiter, resendVerification);

// ── Protected ─────────────────────────────────────────────────────────────────

// GET /api/v1/auth/profile
router.get("/profile", protect, getProfile);

// PUT /api/v1/auth/profile
router.put("/profile", protect, updateProfile);

// PUT /api/v1/auth/password
router.put("/password", protect, changePassword);

module.exports = router;
