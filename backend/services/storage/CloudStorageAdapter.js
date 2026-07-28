/**
 * services/storage/CloudStorageAdapter.js
 *
 * PRODUCTION CLOUD STORAGE — stubs that require external configuration.
 *
 * These adapters will throw a clear ConfigurationError at startup if the
 * required environment variables are not set.
 *
 * Cloudinary requires: CLOUDINARY_URL
 * S3/compatible requires: S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *
 * To use:
 *   1. Set STORAGE_ADAPTER=cloudinary or STORAGE_ADAPTER=s3 in your production .env
 *   2. Provide the required credentials (see .env.example)
 *   3. Install the appropriate SDK:
 *      npm install cloudinary        (for Cloudinary)
 *      npm install @aws-sdk/client-s3 (for S3)
 */

'use strict';

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Cloudinary adapter stub.
 * Install 'cloudinary' package and configure CLOUDINARY_URL to activate.
 */
const cloudinaryAdapter = () => {
  if (!process.env.CLOUDINARY_URL) {
    throw new ConfigurationError(
      'STORAGE_ADAPTER=cloudinary requires CLOUDINARY_URL to be set. ' +
      'See .env.example for the required format.'
    );
  }

  // Lazy-load so the package is only required when actually configured
  let cloudinary;
  try {
    cloudinary = require('cloudinary').v2;
  } catch {
    throw new ConfigurationError(
      'Cloudinary SDK not installed. Run: npm install cloudinary'
    );
  }

  const upload = async (buffer, storageKey, mimetype) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: storageKey, resource_type: 'image', overwrite: true },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url });
        }
      );
      stream.end(buffer);
    });
  };

  const deleteFile = async (storageKey) => {
    await cloudinary.uploader.destroy(storageKey, { resource_type: 'image' });
  };

  const getUrl = (storageKey) => {
    return cloudinary.url(storageKey, { secure: true });
  };

  return { upload, delete: deleteFile, getUrl };
};

/**
 * AWS S3 / compatible adapter stub.
 * Install '@aws-sdk/client-s3' and configure S3_* env vars to activate.
 */
const s3Adapter = () => {
  const requiredVars = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new ConfigurationError(
      `STORAGE_ADAPTER=s3 requires these environment variables: ${missing.join(', ')}. ` +
      'See .env.example for details.'
    );
  }

  let S3Client, PutObjectCommand, DeleteObjectCommand;
  try {
    ({ S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'));
  } catch {
    throw new ConfigurationError(
      'AWS S3 SDK not installed. Run: npm install @aws-sdk/client-s3'
    );
  }

  const client = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const BUCKET = process.env.S3_BUCKET;

  const upload = async (buffer, storageKey, mimetype) => {
    await client.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         storageKey,
      Body:        buffer,
      ContentType: mimetype,
    }));
    return { url: `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${storageKey}` };
  };

  const deleteFile = async (storageKey) => {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  };

  const getUrl = (storageKey) =>
    `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${storageKey}`;

  return { upload, delete: deleteFile, getUrl };
};

module.exports = { cloudinaryAdapter, s3Adapter, ConfigurationError };
