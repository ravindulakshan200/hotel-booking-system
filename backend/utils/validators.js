/**
 * utils/validators.js
 *
 * Input validation helpers for authentication routes.
 * Returns a structured result: { valid: boolean, errors: string[] }
 *
 * These are intentionally lightweight — no external library required.
 * Extend with more rules as additional routes are implemented.
 */

// Simple email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password must be at least 6 characters
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validate registration input fields.
 *
 * @param {object} body — req.body from the register route
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateRegisterInput = (body) => {
  const errors = [];
  const { first_name, last_name, email, password, phone } = body;

  // first_name
  if (!first_name || typeof first_name !== "string" || first_name.trim().length === 0) {
    errors.push("first_name is required");
  } else if (first_name.trim().length > 50) {
    errors.push("first_name must not exceed 50 characters");
  }

  // last_name
  if (!last_name || typeof last_name !== "string" || last_name.trim().length === 0) {
    errors.push("last_name is required");
  } else if (last_name.trim().length > 50) {
    errors.push("last_name must not exceed 50 characters");
  }

  // email
  if (!email || typeof email !== "string" || email.trim().length === 0) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push("email must be a valid email address");
  }

  // password
  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("password is required");
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // phone — optional, but validate format if provided
  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string" || phone.trim().length > 20) {
      errors.push("phone must be a string of max 20 characters");
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate login input fields.
 *
 * @param {object} body — req.body from the login route
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateLoginInput = (body) => {
  const errors = [];
  const { email, password } = body;

  // email
  if (!email || typeof email !== "string" || email.trim().length === 0) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push("email must be a valid email address");
  }

  // password
  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("password is required");
  }

  return { valid: errors.length === 0, errors };
};

module.exports = { validateRegisterInput, validateLoginInput };
