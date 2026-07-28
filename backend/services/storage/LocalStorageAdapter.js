/**
 * services/storage/LocalStorageAdapter.js
 *
 * LOCAL DEVELOPMENT ONLY — not suitable for production or serverless environments.
 *
 * Stores uploaded images in backend/uploads/.
 * Files written here are NOT permanent on Vercel or other serverless platforms
 * because the filesystem is ephemeral and may be wiped between deployments.
 *
 * For production, configure STORAGE_ADAPTER=cloudinary or STORAGE_ADAPTER=s3.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Absolute path to the uploads directory (inside backend/)
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads dir exists when module is loaded
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Warn clearly in non-test environments
if (process.env.NODE_ENV !== 'test') {
  console.warn(
    '[StorageAdapter] Using LocalStorageAdapter (STORAGE_ADAPTER=local). ' +
    'This is suitable for local development only. ' +
    'Files are not persisted on serverless/Vercel deployments.'
  );
}

/**
 * Upload a file buffer to local disk.
 * @param {Buffer} buffer
 * @param {string} storageKey — UUID-based filename with extension
 * @param {string} mimetype   — unused here; key determines content type when served
 * @returns {Promise<{ url: string }>}
 */
const upload = async (buffer, storageKey, mimetype) => {
  // Safety: storageKey must be a plain filename, no path separators
  const safe = path.basename(storageKey);
  if (safe !== storageKey || storageKey.includes('..')) {
    throw new Error('Invalid storage key — path traversal detected.');
  }

  const filePath = path.join(UPLOADS_DIR, safe);
  fs.writeFileSync(filePath, buffer);

  // URL served via /uploads/:key static route (mounted in app.js)
  return { url: `/uploads/${safe}` };
};

/**
 * Delete a file from local disk.
 * Silently ignores ENOENT (already deleted / orphaned).
 * @param {string} storageKey
 */
const deleteFile = async (storageKey) => {
  const safe = path.basename(storageKey);
  const filePath = path.join(UPLOADS_DIR, safe);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

/**
 * Return the public URL for a storage key.
 * @param {string} storageKey
 * @returns {string}
 */
const getUrl = (storageKey) => `/uploads/${path.basename(storageKey)}`;

module.exports = { upload, delete: deleteFile, getUrl };
