const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const targetDirs = process.argv.slice(2);
if (targetDirs.length === 0) {
  console.error("Please provide at least one target directory. Example: node scripts/run-tests.js tests/unit");
  process.exit(1);
}

const testFiles = [];

const findTests = (dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findTests(fullPath);
    } else if (stat.isFile() && file.endsWith('.test.js')) {
      testFiles.push(fullPath);
    }
  }
};

targetDirs.forEach(dir => {
  findTests(path.resolve(process.cwd(), dir));
});

if (testFiles.length === 0) {
  console.error(`No .test.js files found in ${targetDirs.join(', ')}`);
  process.exit(1);
}

const result = spawnSync('node', ['--test', ...testFiles], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
