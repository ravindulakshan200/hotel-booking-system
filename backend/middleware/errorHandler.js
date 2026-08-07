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
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Log full stack in development for easier debugging
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err.stack);
  } else if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    // Sanitized production error logging
    console.error("❌ Production Error:", {
      name: err.name,
      code: err.code || "UNKNOWN_ERROR",
      method: req.method,
      path: req.path
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON request body.";
  }

  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "A record with the same unique value already exists.";
  }

  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errorCode && { code: err.errorCode }),
    ...(err.details && { errors: err.details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
