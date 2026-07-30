const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const http = require("http");

test("Vercel Startup and Storage Regression Test Suite", async (t) => {
  const originalVercel = process.env.VERCEL;
  const originalStorage = process.env.STORAGE_ADAPTER;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";
  process.env.NODE_ENV = "test";

  let server;
  let adapter;
  let testImageKey;

  const StorageAdapter = require('../../services/storage/StorageAdapter');
  
  t.after(async () => {
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    if (testImageKey) {
      const filePath = path.join(__dirname, '../../uploads', testImageKey);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
    }

    if (originalVercel !== undefined) process.env.VERCEL = originalVercel;
    else delete process.env.VERCEL;
    
    if (originalStorage !== undefined) process.env.STORAGE_ADAPTER = originalStorage;
    else delete process.env.STORAGE_ADAPTER;

    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;

    if (originalJwtSecret !== undefined) process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    
    StorageAdapter.resetAdapter();
    
    // Close the database pool to allow the process to exit
    try {
      const pool = require('../../config/db');
      if (pool && pool.end) await pool.end();
    } catch (e) {
      // ignore
    }
  });

  await t.test("Vercel mode with local adapter prevents filesystem writes and directory creation", async () => {
    process.env.VERCEL = "1";
    process.env.STORAGE_ADAPTER = "local";

    const createApp = require('../../app');
    const LocalStorageAdapter = require('../../services/storage/LocalStorageAdapter');
    
    StorageAdapter.resetAdapter();
    adapter = StorageAdapter.getAdapter();
    assert.strictEqual(adapter, LocalStorageAdapter);

    const app = createApp();
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    await res.json(); // Consume body

    let errorCaught = false;
    try {
      await adapter.upload(Buffer.from("fake"), "fake.jpg", "image/jpeg");
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.statusCode, 503);
      assert.match(err.message, /Image uploads require cloud storage configuration/);
    }
    assert.ok(errorCaught, "Expected upload to fail with 503");

    let deleteErrorCaught = false;
    try {
      await adapter.delete("fake.jpg");
    } catch (err) {
      deleteErrorCaught = true;
      assert.strictEqual(err.statusCode, 503);
      assert.match(err.message, /Image uploads require cloud storage configuration/);
    }
    assert.ok(deleteErrorCaught, "Expected delete to fail with 503");
  });

  await t.test("Local mode with local adapter allows directory lazy creation", async () => {
    delete process.env.VERCEL;
    process.env.STORAGE_ADAPTER = "local";

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    
    const createApp = require('../../app');
    const app = createApp(); 
    assert.ok(fs.existsSync(uploadsDir), "Local mode should create uploads dir in app.js");

    StorageAdapter.resetAdapter();
    adapter = StorageAdapter.getAdapter();
    
    testImageKey = "test_lazy.jpg";
    const result = await adapter.upload(Buffer.from("fake"), testImageKey, "image/jpeg");
    assert.strictEqual(result.url, `/uploads/${testImageKey}`);
    assert.ok(fs.existsSync(path.join(uploadsDir, testImageKey)));

    await adapter.delete(testImageKey);
    assert.strictEqual(fs.existsSync(path.join(uploadsDir, testImageKey)), false);
  });
  
  await t.test("Cloud adapter selection works without making calls", async () => {
    process.env.VERCEL = "1";
    const { ConfigurationError } = require('../../services/storage/CloudStorageAdapter');
    
    process.env.STORAGE_ADAPTER = "cloudinary";
    StorageAdapter.resetAdapter();
    assert.throws(() => {
      StorageAdapter.getAdapter();
    }, ConfigurationError, "Should attempt to load cloudinary and throw ConfigurationError due to missing config");
    
    process.env.STORAGE_ADAPTER = "s3";
    StorageAdapter.resetAdapter();
    assert.throws(() => {
      StorageAdapter.getAdapter();
    }, ConfigurationError, "Should attempt to load S3 and throw ConfigurationError due to missing config");
  });
});
