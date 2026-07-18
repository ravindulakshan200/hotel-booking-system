const { parseDateOnly, getTodayDateOnly, calculateNights } = require("./dateUtils");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9()\-\s]{7,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const validateName = (value, field, errors) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} is required`);
  } else if (value.trim().length > 50) {
    errors.push(`${field} must not exceed 50 characters`);
  }
};

const validatePasswordStrength = (password, field, errors) => {
  if (typeof password !== "string" || password.length === 0) {
    errors.push(`${field} is required`);
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`${field} must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    errors.push(`${field} must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes`);
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push(`${field} must include at least one letter and one number`);
  }
};

const validateRegisterInput = (body = {}) => {
  const errors = [];
  const { first_name, last_name, email, password, phone } = body;

  validateName(first_name, "first_name", errors);
  validateName(last_name, "last_name", errors);

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150) {
    errors.push("email must be a valid email address of at most 150 characters");
  }

  validatePasswordStrength(password, "password", errors);

  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string" || !PHONE_REGEX.test(phone.trim())) {
      errors.push("phone must be a valid phone number of 7 to 20 characters");
    }
  }

  return { valid: errors.length === 0, errors };
};

const validateLoginInput = (body = {}) => {
  const errors = [];
  const { email, password } = body;

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push("email must be a valid email address");
  }
  if (typeof password !== "string" || password.length === 0) {
    errors.push("password is required");
  }

  return { valid: errors.length === 0, errors };
};

const validateProfileInput = (body = {}) => {
  const errors = [];
  const allowedFields = ["first_name", "last_name", "phone"];
  const providedFields = allowedFields.filter((field) => body[field] !== undefined);

  if (providedFields.length === 0) {
    errors.push("Provide at least one field to update (first_name, last_name, phone)");
  }

  if (body.first_name !== undefined) validateName(body.first_name, "first_name", errors);
  if (body.last_name !== undefined) validateName(body.last_name, "last_name", errors);
  if (body.phone !== undefined && body.phone !== null && body.phone !== "") {
    if (typeof body.phone !== "string" || !PHONE_REGEX.test(body.phone.trim())) {
      errors.push("phone must be a valid phone number of 7 to 20 characters");
    }
  }

  return { valid: errors.length === 0, errors };
};

const validatePasswordChangeInput = (body = {}) => {
  const errors = [];
  const { current_password, new_password } = body;

  if (typeof current_password !== "string" || current_password.length === 0) {
    errors.push("current_password is required");
  }
  validatePasswordStrength(new_password, "new_password", errors);
  if (current_password && new_password && current_password === new_password) {
    errors.push("new_password must be different from current_password");
  }

  return { valid: errors.length === 0, errors };
};

const validateBookingInput = (body = {}) => {
  const errors = [];
  const roomId = Number(body.room_id);
  const { check_in, check_out } = body;

  if (!Number.isInteger(roomId) || roomId < 1) {
    errors.push("room_id must be a positive integer");
  }
  if (!parseDateOnly(check_in)) {
    errors.push("check_in must use a valid YYYY-MM-DD date");
  }
  if (!parseDateOnly(check_out)) {
    errors.push("check_out must use a valid YYYY-MM-DD date");
  }

  if (parseDateOnly(check_in) && check_in < getTodayDateOnly()) {
    errors.push("check_in cannot be in the past");
  }
  if (parseDateOnly(check_in) && parseDateOnly(check_out) && calculateNights(check_in, check_out) < 1) {
    errors.push("check_out must be after check_in");
  }

  return { valid: errors.length === 0, errors };
};

const validateAvailabilitySearch = (query = {}) => {
  const errors = [];
  const { check_in, check_out, guests, min_price, max_price } = query;

  if (!check_in) {
    errors.push("check_in is required");
  } else if (!parseDateOnly(check_in)) {
    errors.push("check_in must use a valid YYYY-MM-DD date");
  } else if (check_in < getTodayDateOnly()) {
    errors.push("check_in cannot be in the past");
  }

  if (!check_out) {
    errors.push("check_out is required");
  } else if (!parseDateOnly(check_out)) {
    errors.push("check_out must use a valid YYYY-MM-DD date");
  }

  if (parseDateOnly(check_in) && parseDateOnly(check_out) && calculateNights(check_in, check_out) < 1) {
    errors.push("check_out must be after check_in");
  }

  if (!guests) {
    errors.push("guests is required");
  } else if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > 20) {
    errors.push("guests must be an integer between 1 and 20");
  }

  if (min_price !== undefined) {
    if (isNaN(Number(min_price)) || Number(min_price) < 0) {
      errors.push("min_price must be a positive number");
    }
  }

  if (max_price !== undefined) {
    if (isNaN(Number(max_price)) || Number(max_price) < 0) {
      errors.push("max_price must be a positive number");
    }
  }

  if (min_price !== undefined && max_price !== undefined && Number(min_price) > Number(max_price)) {
    errors.push("min_price cannot be greater than max_price");
  }

  return { valid: errors.length === 0, errors };
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
  validateRegisterInput,
  validateLoginInput,
  validateProfileInput,
  validatePasswordChangeInput,
  validateBookingInput,
  validateAvailabilitySearch,
};
