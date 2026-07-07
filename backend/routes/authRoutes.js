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

const { register, login, getProfile, updateProfile, changePassword } = require("../controllers/authController");
const { protect }                     = require("../middleware/authMiddleware");

// ── Public ────────────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post("/register", register);

// POST /api/v1/auth/login
router.post("/login", login);

// ── Protected ─────────────────────────────────────────────────────────────────

// GET /api/v1/auth/profile
router.get("/profile", protect, getProfile);

// PUT /api/v1/auth/profile
router.put("/profile", protect, updateProfile);

// PUT /api/v1/auth/password
router.put("/password", protect, changePassword);

module.exports = router;
