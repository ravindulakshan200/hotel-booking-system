const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = 'hotel-booking-system.zip';
const outputPath = path.join(process.cwd(), outputFile);

console.log('Creating a clean archive of the project...');
console.log('This will only include Git-tracked files, excluding node_modules, .env, logs, etc.');

try {
  // Ensure we are in a git repository
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

  // Use git archive to package tracked files only
  execSync(`git archive --format=zip -o "${outputFile}" HEAD`, { stdio: 'inherit' });

  console.log(`\nArchive created successfully: ${outputPath}`);
} catch (error) {
  console.error('\nFailed to create archive. Ensure you are in a Git repository and have Git installed.');
  console.error(error.message);
  process.exit(1);
}
