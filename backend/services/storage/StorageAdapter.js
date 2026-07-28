/**
 * services/storage/StorageAdapter.js
 *
 * Storage adapter factory.
 * Selects the implementation based on the STORAGE_ADAPTER env variable:
 *   'local'      — local filesystem (dev only)
 *   'cloudinary' — Cloudinary (requires CLOUDINARY_URL)
 *   's3'         — AWS S3 / compatible (requires S3_* env vars)
 *
 * The interface every adapter must implement:
 *   upload(buffer, storageKey, mimetype)  → Promise<{ url: string }>
 *   delete(storageKey)                    → Promise<void>
 *   getUrl(storageKey)                    → string
 */

'use strict';

let _adapter = null;

const getAdapter = () => {
  if (_adapter) return _adapter;

  const type = (process.env.STORAGE_ADAPTER || 'local').toLowerCase();

  if (type === 'local') {
    _adapter = require('./LocalStorageAdapter');
  } else if (type === 'cloudinary') {
    _adapter = require('./CloudStorageAdapter').cloudinaryAdapter();
  } else if (type === 's3') {
    _adapter = require('./CloudStorageAdapter').s3Adapter();
  } else {
    throw new Error(`Unknown STORAGE_ADAPTER: "${type}". Must be 'local', 'cloudinary', or 's3'.`);
  }

  return _adapter;
};

// Reset adapter (used in tests)
const resetAdapter = () => { _adapter = null; };

module.exports = { getAdapter, resetAdapter };
