/**
 * middleware/authMiddleware.js
 *
 * JWT Authentication Middleware.
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * fetches the matching user from the database, and attaches the user
 * object to req.user so downstream route handlers can access it.
 *
 * Returns 401 Unauthorized if:
 *   - No Authorization header is present
 *   - Token format is invalid (not "Bearer <token>")
 *   - JWT signature verification fails
 *   - Token has expired
 *   - User referenced by token no longer exists in the database
 *
 * Usage:
 *   const { protect } = require('../middleware/authMiddleware');
 *   router.get('/profile', protect, getProfile);
 */

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect
 * Express middleware that verifies the JWT and populates req.user.
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract the token from the Authorization header ──────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>" → "<token>"

    // ── 2. Verify the token ──────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Distinguish between expired and malformed tokens for clearer messages
      const message =
        jwtError.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token. Please log in again.";

      return res.status(401).json({ success: false, message });
    }

    // ── 3. Fetch the user from the database ──────────────────────────────────
    // findUserById excludes the password field — safe to store on req.user
    const user = await User.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user associated with this token no longer exists.",
      });
    }

    // ── 4. Attach user to the request object and continue ───────────────────
    req.user = user;
    next();

  } catch (error) {
    // Unexpected server errors go to the global error handler
    next(error);
  }
};

module.exports = { protect };
