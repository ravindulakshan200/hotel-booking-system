const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../../config/db');

test("Database Schema Parity Tests", async (t) => {
  const checkTableExists = async (tableName) => {
    const [rows] = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    return rows.length > 0;
  };

  const checkColumnExists = async (tableName, columnName) => {
    const [rows] = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [tableName, columnName]
    );
    return rows.length > 0;
  };

  await t.test('users table has Phase 7C columns', async () => {
    assert.equal(await checkColumnExists('users', 'is_active'), true);
    assert.equal(await checkColumnExists('users', 'deactivated_at'), true);
    assert.equal(await checkColumnExists('users', 'deactivation_reason'), true);
  });

  await t.test('hotels table has Phase 7C columns', async () => {
    assert.equal(await checkColumnExists('hotels', 'latitude'), true);
    assert.equal(await checkColumnExists('hotels', 'longitude'), true);
  });

  await t.test('hotel_images table exists', async () => {
    assert.equal(await checkTableExists('hotel_images'), true);
  });

  await t.test('audit_logs table exists', async () => {
    assert.equal(await checkTableExists('audit_logs'), true);
  });

  await t.test('support_tickets table and Phase 7C columns exist', async () => {
    assert.equal(await checkTableExists('support_tickets'), true);
    assert.equal(await checkColumnExists('support_tickets', 'lookup_token_hash'), true);
  });

  await t.test('reviews table has Phase 7C columns', async () => {
    assert.equal(await checkColumnExists('reviews', 'is_hidden'), true);
    assert.equal(await checkColumnExists('reviews', 'hidden_at'), true);
    assert.equal(await checkColumnExists('reviews', 'hidden_by_admin_id'), true);
    assert.equal(await checkColumnExists('reviews', 'is_deleted'), true);
    assert.equal(await checkColumnExists('reviews', 'deleted_at'), true);
  });

  await t.test('review_reports table exists', async () => {
    assert.equal(await checkTableExists('review_reports'), true);
  });

  await t.test('invoices and receipts tables exist', async () => {
    assert.equal(await checkTableExists('invoices'), true);
    assert.equal(await checkTableExists('receipts'), true);
  });
});

test.after(async () => {
  await pool.end();
});
