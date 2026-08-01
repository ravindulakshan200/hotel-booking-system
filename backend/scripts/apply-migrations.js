const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = require('../config/db');

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files in directory.`);

  const connection = await pool.getConnection();

  try {
    // 1. Ensure schema_migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Acquire a migration lock to prevent concurrent runs
    console.log("Acquiring schema migration lock...");
    const [lockResult] = await connection.query("SELECT GET_LOCK('schema_migration_lock', 10) AS locked");
    if (!lockResult || lockResult[0].locked !== 1) {
      throw new Error("Could not acquire schema migration lock. Another migration runner might be active.");
    }
    console.log("Lock acquired.");

    try {
      // 3. Fetch already applied migrations
      const [appliedRows] = await connection.query("SELECT migration_name FROM schema_migrations");
      const appliedSet = new Set(appliedRows.map(r => r.migration_name));

      for (const file of files) {
        if (appliedSet.has(file)) {
          console.log(`Migration already applied: ${file} (Skipping)`);
          continue;
        }

        console.log(`Applying migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        // Support DELIMITER and safely ignore "already exists" errors
        let currentDelimiter = ';';
        const queries = [];
        let currentQuery = '';

        const lines = sqlContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('--')) continue;

          if (trimmed.toUpperCase().startsWith('DELIMITER ')) {
            currentDelimiter = trimmed.substring(10).trim();
            continue;
          }

          currentQuery += line + '\n';

          if (trimmed.endsWith(currentDelimiter)) {
            let q = currentQuery.trim();
            q = q.substring(0, q.length - currentDelimiter.length);
            if (q.trim().length > 0) {
              queries.push(q.trim());
            }
            currentQuery = '';
          }
        }

        if (currentQuery.trim().length > 0) {
           queries.push(currentQuery.trim());
        }

        // Execute each query. We DO NOT suppress duplicate errors. Migrations must be perfectly idempotent.
        for (let query of queries) {
          await connection.query(query);
        }

        // Record successful completion
        await connection.query("INSERT INTO schema_migrations (migration_name) VALUES (?)", [file]);
        console.log(`Migration successfully applied and recorded: ${file}`);
      }
      console.log('All migrations checked and applied.');
    } finally {
      // 4. Release lock
      await connection.query("SELECT RELEASE_LOCK('schema_migration_lock')");
      console.log("Schema migration lock released.");
    }

  } catch (error) {
    console.error('Migration run failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Only execute when run directly from command line
if (require.main === module) {
  run();
}

module.exports = { run };
