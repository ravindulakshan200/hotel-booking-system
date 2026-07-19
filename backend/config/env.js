const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const unsafePlaceholders = new Set([
    "change_this_secret",
    "your_jwt_secret_here",
    "replace_with_a_private_random_secret_of_at_least_32_characters",
  ]);

  if (!secret || unsafePlaceholders.has(secret)) {
    throw new Error("JWT_SECRET must be configured with a private value.");
  }

  return secret;
};

const getAllowedOrigins = () => {
  const configured = process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173";
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getTrustProxy = () => {
  const value = process.env.TRUST_PROXY;
  if (!value || value === "false") {
    return false;
  }
  if (value === "true") {
    return true;
  }
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  throw new Error("TRUST_PROXY must be 'true', 'false', or a non-negative integer hop count.");
};

const validateEnvironment = () => {
  const errors = [];

  try {
    const secret = getJwtSecret();
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
      errors.push("JWT_SECRET must contain at least 32 characters in production.");
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    getTrustProxy();
  } catch (error) {
    errors.push(error.message);
  }

  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join(" ")}`);
  }
};

module.exports = { getJwtSecret, getAllowedOrigins, getTrustProxy, validateEnvironment };
