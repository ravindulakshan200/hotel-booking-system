/**
 * middleware/uploadMiddleware.js
 *
 * Secure multipart image upload middleware using multer + memoryStorage.
 *
 * Security measures:
 *  - MIME type allowlist (JPEG, PNG, WebP only)
 *  - File signature (magic bytes) validation
 *  - File extension validation
 *  - 5 MB per-file size limit
 *  - Configurable max image count per hotel
 *  - Filename is NEVER used — randomized UUID storage keys generated later
 *  - No files written to temp disk in this middleware (memoryStorage)
 *  - Path traversal impossible — original filename is never used for storage
 */

'use strict';

const multer = require('multer');
const { randomUUID } = require('crypto');
const path = require('path');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_HOTEL = 10;

/** Allowed MIME types → expected magic byte sequences */
const ALLOWED_TYPES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
  ],
  'image/png':  [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  ],
  'image/webp': [
    // RIFF....WEBP
    // bytes 0-3: 52 49 46 46, bytes 8-11: 57 45 42 50
    null, // special-cased below
  ],
};

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Validate that a buffer's magic bytes match the claimed MIME type.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {boolean}
 */
const validateMagicBytes = (buffer, mimetype) => {
  if (mimetype === 'image/webp') {
    // RIFF at 0 and WEBP at 8
    return (
      buffer[0] === 0x52 && buffer[1] === 0x49 &&
      buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 &&
      buffer[10] === 0x42 && buffer[11] === 0x50
    );
  }

  const signatures = ALLOWED_TYPES[mimetype];
  if (!signatures) return false;

  return signatures.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  );
};

// Multer with memory storage — never touches disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // 1. MIME type check
  if (!Object.keys(ALLOWED_TYPES).includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG and WebP are allowed.`));
  }

  // 2. Extension check (from original filename — secondary guard only)
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported file extension: ${ext}. Only .jpg, .jpeg, .png, .webp are allowed.`));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_IMAGES_PER_HOTEL,
  },
});

/**
 * Post-upload middleware: validates magic bytes for each uploaded file
 * and generates a random UUID-based storage key.
 *
 * Attaches to each file in req.files:
 *   file.storageKey — randomized key to use when storing (e.g. "a3f2b1c4-….jpg")
 */
const validateAndKeyFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  for (const file of req.files) {
    // Magic bytes validation
    if (!validateMagicBytes(file.buffer, file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File "${file.originalname}" has an invalid file signature. Upload was rejected.`,
      });
    }

    // Generate randomized storage key — NEVER uses original filename
    const ext = file.mimetype === 'image/jpeg' ? '.jpg'
              : file.mimetype === 'image/png'  ? '.png'
              : '.webp';
    file.storageKey = `${randomUUID()}${ext}`;
  }

  next();
};

module.exports = {
  upload,
  validateAndKeyFiles,
  MAX_IMAGES_PER_HOTEL,
  MAX_FILE_SIZE_BYTES,
  validateMagicBytes, // exported for tests
};
