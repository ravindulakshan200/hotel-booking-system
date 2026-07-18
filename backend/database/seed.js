/**
 * database/seed.js
 * Re-seeds user passwords with bcrypt hashes.
 * Run: node database/seed.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const SEED_USERS = [
  { email: "admin@hotelbooking.com", password: "password123" },
  { email: "john.doe@example.com", password: "Customer@123" },
  { email: "jane.smith@example.com", password: "Customer@123" },
];

async function seed() {
  try {
    for (const user of SEED_USERS) {
      const hash = await bcrypt.hash(user.password, 12);
      await pool.query("UPDATE users SET password = ? WHERE email = ?", [hash, user.email]);
      console.log(`Updated password for ${user.email}`);
    }
    console.log("Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
