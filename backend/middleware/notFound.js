/**
 * middleware/notFound.js
 *
 * 404 Not Found Middleware.
 * Catches requests to any undefined route and passes a structured
 * 404 error to the global errorHandler middleware.
 *
 * Must be registered BEFORE errorHandler but AFTER all routes in server.js.
 */

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error); // Delegate to errorHandler
};

module.exports = notFound;
