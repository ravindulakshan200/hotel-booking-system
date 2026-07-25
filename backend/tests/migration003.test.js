const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Migration 003 Safety Test', async (t) => {
  // Read the actual migration SQL
  const sqlFile = path.join(__dirname, '..', 'database', 'migrations', '003_ensure_account_security_fields.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Extract the UPDATE statement logic manually to test it in JS
  // The logic is:
  // SET email_verified_at = COALESCE(email_verified_at, created_at)
  // WHERE email_verified_at IS NULL AND created_at < '2026-07-25 00:00:00'

  const hasFixedCutoff = sql.includes("created_at < '2026-07-25 00:00:00'");
  assert.ok(hasFixedCutoff, "Migration must include fixed cutoff date");

  // Simulate users table
  let users = [
    { id: 1, type: 'legacy_unverified', created_at: new Date('2026-01-01T10:00:00Z'), email_verified_at: null },
    { id: 2, type: 'legacy_verified', created_at: new Date('2026-01-01T10:00:00Z'), email_verified_at: new Date('2026-01-02T10:00:00Z') },
    { id: 3, type: 'new_unverified', created_at: new Date('2026-08-01T10:00:00Z'), email_verified_at: null }
  ];

  const applyMigrationLogic = () => {
    const cutoff = new Date('2026-07-25T00:00:00Z');
    users.forEach(u => {
      if (u.email_verified_at === null && u.created_at < cutoff) {
        u.email_verified_at = u.created_at; // COALESCE(email_verified_at, created_at)
      }
    });
  };

  await t.test('Initial apply', () => {
    applyMigrationLogic();

    const legacyUnverified = users.find(u => u.id === 1);
    const legacyVerified = users.find(u => u.id === 2);
    const newUnverified = users.find(u => u.id === 3);

    // 1. an old legacy user is backfilled
    assert.ok(legacyUnverified.email_verified_at !== null, "Legacy unverified user should be backfilled");
    assert.equal(legacyUnverified.email_verified_at.getTime(), legacyUnverified.created_at.getTime(), "Backfilled with created_at");

    // 2. an already verified user remains unchanged
    assert.equal(legacyVerified.email_verified_at.getTime(), new Date('2026-01-02T10:00:00Z').getTime(), "Already verified user remains unchanged");

    // 3. a new user created after the cutoff remains unverified
    assert.strictEqual(newUnverified.email_verified_at, null, "New user after cutoff remains unverified");
  });

  await t.test('Rerun applies idempotency (does not verify new user)', () => {
    // Add another new user just in case
    users.push({ id: 4, type: 'newer_unverified', created_at: new Date('2026-09-01T10:00:00Z'), email_verified_at: null });

    applyMigrationLogic();

    const newUnverified = users.find(u => u.id === 3);
    const newerUnverified = users.find(u => u.id === 4);

    // 4. rerunning the migration logic does not verify the new user
    assert.strictEqual(newUnverified.email_verified_at, null, "New user remains unverified on rerun");
    assert.strictEqual(newerUnverified.email_verified_at, null, "Newer user remains unverified on rerun");
  });
});
