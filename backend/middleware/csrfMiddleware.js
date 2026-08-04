const crypto = require("crypto");
const HttpError = require("../utils/httpError");

/**
 * csrfMiddleware.js
 * 
 * Verifies that the x-csrf-token header matches the csrfToken cookie for all state-changing requests.
 * Uses Double Submit Cookie pattern.
 */
const csrfMiddleware = (req, res, next) => {
  // Safe methods do not require CSRF token
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken) {
    return next(new HttpError(403, "Invalid or missing CSRF token."));
  }

  if (cookieToken.length !== headerToken.length || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return next(new HttpError(403, "Invalid or missing CSRF token."));
  }

  next();
};

module.exports = csrfMiddleware;
