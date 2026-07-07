/**
 * middleware/errorHandler.js
 *
 * Global Error Handler Middleware.
 * Must be registered LAST in server.js (after all routes).
 * Catches all errors passed via next(error) and returns a
 * consistent JSON error response.
 *
 * Usage:
 *   app.use(errorHandler);  // Always the very last middleware
 */

const errorHandler = (err, req, res, next) => {
  // Log full stack in development for easier debugging
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    // Expose stack trace only in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
