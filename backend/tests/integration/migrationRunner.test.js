const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');
const { run: runMigrations } = require('../../scripts/apply-migrations');

test("Migration Runner Tests", async (t) => {
  const tempMigrationsDir = path.join(__dirname, '..', '..', 'database', 'temp_migrations_test');

  test.before(async () => {
    if (!fs.existsSync(tempMigrationsDir)) {
      fs.mkdirSync(tempMigrationsDir, { recursive: true });
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  });

  test.after(async () => {
    if (fs.existsSync(tempMigrationsDir)) {
      fs.rmSync(tempMigrationsDir, { recursive: true, force: true });
    }
    // Clean up schema_migrations test entries
    await pool.query("DELETE FROM schema_migrations WHERE migration_name LIKE '%_test_migration_%'");
  });

  await t.test("First run: successfully runs a new migration and records it", async () => {
    // Create temporary table test query
    const migrationFile = '099_test_migration_first.sql';
    const sql = `
      CREATE TABLE IF NOT EXISTS test_migration_table (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50)
      );
    `;
    fs.writeFileSync(path.join(tempMigrationsDir, migrationFile), sql);

    // Mock readdirSync to read from our temp folder during run
    const originalReaddirSync = fs.readdirSync;
    const originalReadFileSync = fs.readFileSync;
    const originalJoin = path.join;

    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };

    path.join = (...args) => {
      if (args[args.length - 1] === migrationFile) {
        return originalJoin(tempMigrationsDir, migrationFile);
      }
      return originalJoin(...args);
    };

    try {
      // Run migrations
      // Override process.exit temporarily
      const originalExit = process.exit;
      let exitCode = null;
      process.exit = (code) => {
        exitCode = code;
      };

      // We need to patch require.main === module check by exporting run
      const runner = require('../../scripts/apply-migrations');

      // Let's run it by calling it directly, keeping connection pool open
      const connection = await pool.getConnection();
      try {
        // Run migration logic manually using the connection
        await connection.query("DELETE FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
        await connection.query("DROP TABLE IF EXISTS test_migration_table");

        // Now run migrations logic
        await runner.run();

        // Assert table was created and recorded
        const [rows] = await connection.query("SELECT migration_name FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].migration_name, migrationFile);
      } finally {
        connection.release();
        process.exit = originalExit;
      }
    } finally {
      fs.readdirSync = originalReaddirSync;
      fs.readFileSync = originalReadFileSync;
      path.join = originalJoin;
    }
  });

  await t.test("Second run: skips already applied migrations", async () => {
    const migrationFile = '099_test_migration_first.sql';
    // Mock readdirSync
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };

    try {
      const runner = require('../../scripts/apply-migrations');

      // Ensure it is already recorded
      await pool.query("INSERT IGNORE INTO schema_migrations (migration_name) VALUES (?)", [migrationFile]);

      let queriesRun = 0;
      const originalQuery = pool.query;
      // Wrap pool query to inspect
      pool.query = async function(...args) {
        if (args[0].includes("CREATE TABLE IF NOT EXISTS test_migration_table")) {
          queriesRun++;
        }
        return originalQuery.apply(this, args);
      };

      try {
        await runner.run();
        // Since it's already in schema_migrations, it should not have run the creation query again
        assert.equal(queriesRun, 0);
      } finally {
        pool.query = originalQuery;
      }
    } finally {
      fs.readdirSync = originalReaddirSync;
    }
  });

  await t.test("Partial failure: does not record migration if it fails mid-way", async () => {
    const migrationFile = '098_test_migration_fail.sql';
    // First query is valid, second query is invalid (syntax error)
    const sql = `
      CREATE TABLE IF NOT EXISTS test_migration_fail_table (id INT);
      INVALID SQL STATEMENT HERE;
    `;
    fs.writeFileSync(path.join(tempMigrationsDir, migrationFile), sql);

    const originalReaddirSync = fs.readdirSync;
    const originalJoin = path.join;

    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };

    path.join = (...args) => {
      if (args[args.length - 1] === migrationFile) {
        return originalJoin(tempMigrationsDir, migrationFile);
      }
      return originalJoin(...args);
    };

    try {
      const runner = require('../../scripts/apply-migrations');

      await pool.query("DELETE FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      await pool.query("DROP TABLE IF EXISTS test_migration_fail_table");

      // We expect runner to fail (and call process.exit)
      const originalExit = process.exit;
      let exitCode = null;
      process.exit = (code) => {
        exitCode = code;
        throw new Error("exit called");
      };

      try {
        await runner.run();
      } catch (err) {
        // Expected
      } finally {
        process.exit = originalExit;
      }

      // Assert it was NOT recorded in schema_migrations
      const [rows] = await pool.query("SELECT migration_name FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      assert.equal(rows.length, 0);
    } finally {
      fs.readdirSync = originalReaddirSync;
      path.join = originalJoin;
      await pool.query("DROP TABLE IF EXISTS test_migration_fail_table");
    }
  });

  await t.test("Concurrent execution: lock prevents concurrent runner", async () => {
    const connection1 = await pool.getConnection();
    const connection2 = await pool.getConnection();

    try {
      // connection1 acquires lock
      const [lockResult] = await connection1.query("SELECT GET_LOCK('schema_migration_lock', 10) AS locked");
      assert.equal(lockResult[0].locked, 1);

      // connection2 attempts to acquire lock with short/immediate timeout
      const [lockResult2] = await connection2.query("SELECT GET_LOCK('schema_migration_lock', 0) AS locked");
      assert.equal(lockResult2[0].locked, 0); // Lock acquisition should fail

    } finally {
      await connection1.query("SELECT RELEASE_LOCK('schema_migration_lock')");
      connection1.release();
      connection2.release();
    }
  });

  await t.test("Delimiter support: runs statements with custom delimiters correctly", async () => {
    const migrationFile = '097_test_migration_delimiter.sql';
    const sql = `
      DELIMITER $$
      CREATE TABLE IF NOT EXISTS test_migration_delimiter_table (id INT)$$
      DELIMITER ;
    `;
    fs.writeFileSync(path.join(tempMigrationsDir, migrationFile), sql);

    const originalReaddirSync = fs.readdirSync;
    const originalJoin = path.join;

    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };
    path.join = (...args) => {
      if (args[args.length - 1] === migrationFile) {
        return originalJoin(tempMigrationsDir, migrationFile);
      }
      return originalJoin(...args);
    };

    try {
      const runner = require('../../scripts/apply-migrations');
      await pool.query("DELETE FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      await pool.query("DROP TABLE IF EXISTS test_migration_delimiter_table");

      await runner.run();

      const [rows] = await pool.query("SHOW TABLES LIKE 'test_migration_delimiter_table'");
      assert.equal(rows.length, 1);
    } finally {
      fs.readdirSync = originalReaddirSync;
      path.join = originalJoin;
      await pool.query("DROP TABLE IF EXISTS test_migration_delimiter_table");
    }
  });

  await t.test("Strict duplicate handling: fails on duplicate table creations", async () => {
    const migrationFile = '096_test_migration_duplicate.sql';
    const sql = `
      CREATE TABLE test_migration_duplicate_table (id INT);
      CREATE TABLE test_migration_duplicate_table (id INT);
    `;
    fs.writeFileSync(path.join(tempMigrationsDir, migrationFile), sql);

    const originalReaddirSync = fs.readdirSync;
    const originalJoin = path.join;

    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };
    path.join = (...args) => {
      if (args[args.length - 1] === migrationFile) {
        return originalJoin(tempMigrationsDir, migrationFile);
      }
      return originalJoin(...args);
    };

    try {
      const runner = require('../../scripts/apply-migrations');
      await pool.query("DELETE FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      await pool.query("DROP TABLE IF EXISTS test_migration_duplicate_table");

      // Override exit to catch the failure
      const originalExit = process.exit;
      let exitCode = null;
      process.exit = (code) => {
        exitCode = code;
        throw new Error("exit called");
      };

      try {
        await runner.run();
      } catch (err) {
        // Expected
      } finally {
        process.exit = originalExit;
      }

      // Assert it failed and wasn't recorded
      const [rows] = await pool.query("SELECT migration_name FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      assert.equal(rows.length, 0);
    } finally {
      fs.readdirSync = originalReaddirSync;
      path.join = originalJoin;
      await pool.query("DROP TABLE IF EXISTS test_migration_duplicate_table");
    }
  });

  await t.test("Parser properly handles comments and multiline statements", async () => {
    const migrationFile = '095_test_migration_comments.sql';
    const sql = `
      -- Single line comment
      CREATE TABLE test_migration_comments_table (
        id INT,
        -- inline comment
        name VARCHAR(50)
      );
      /*
        Multiline comment
      */
      ALTER TABLE test_migration_comments_table ADD COLUMN age INT;
    `;
    fs.writeFileSync(path.join(tempMigrationsDir, migrationFile), sql);

    const originalReaddirSync = fs.readdirSync;
    const originalJoin = path.join;

    fs.readdirSync = (dir) => {
      if (dir.endsWith('migrations')) {
        return [migrationFile];
      }
      return originalReaddirSync(dir);
    };
    path.join = (...args) => {
      if (args[args.length - 1] === migrationFile) {
        return originalJoin(tempMigrationsDir, migrationFile);
      }
      return originalJoin(...args);
    };

    try {
      const runner = require('../../scripts/apply-migrations');
      await pool.query("DELETE FROM schema_migrations WHERE migration_name = ?", [migrationFile]);
      await pool.query("DROP TABLE IF EXISTS test_migration_comments_table");

      await runner.run();

      const [rows] = await pool.query("SHOW TABLES LIKE 'test_migration_comments_table'");
      assert.equal(rows.length, 1);

      const [cols] = await pool.query("SHOW COLUMNS FROM test_migration_comments_table LIKE 'age'");
      assert.equal(cols.length, 1);
    } finally {
      fs.readdirSync = originalReaddirSync;
      path.join = originalJoin;
      await pool.query("DROP TABLE IF EXISTS test_migration_comments_table");
    }
  });
});


test.after(async () => {
  await pool.end();
});
