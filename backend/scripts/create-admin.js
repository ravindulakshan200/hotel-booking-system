/**
 * scripts/create-admin.js
 * Creates or resets the default admin user in the database.
 * Run: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');
require('dotenv').config();

const ADMIN_EMAIL    = 'admin@hotel.com';
const ADMIN_PASSWORD = 'Admin@123';

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Generate a proper bcrypt hash (cost factor 12)
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  console.log('Generated hash:', hash);

  // Verify the hash works before saving
  const valid = await bcrypt.compare(ADMIN_PASSWORD, hash);
  if (!valid) throw new Error('Hash verification failed!');
  console.log('Hash verified successfully.');

  // Check if admin already exists
  const [rows] = await conn.execute(
    'SELECT id, email, role FROM users WHERE email = ?',
    [ADMIN_EMAIL]
  );

  if (rows.length > 0) {
    // Update existing record with correct hash
    await conn.execute(
      'UPDATE users SET password = ?, role = ?, email_verified_at = NOW() WHERE email = ?',
      [hash, 'admin', ADMIN_EMAIL]
    );
    console.log(`Admin user updated (id=${rows[0].id})`);
  } else {
    // Insert new admin
    const [result] = await conn.execute(
      `INSERT INTO users (first_name, last_name, email, password, role, email_verified_at)
       VALUES (?, ?, ?, ?, 'admin', NOW())`,
      ['Admin', 'User', ADMIN_EMAIL, hash]
    );
    console.log(`Admin user created (id=${result.insertId})`);
  }

  await conn.end();
  console.log('\n✅ Done!');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
