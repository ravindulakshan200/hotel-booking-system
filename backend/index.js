const { startServer } = require("./server");

startServer().catch((error) => {
  // Do not expose raw credentials or passwords in the error log
  console.error(`Server startup failed: ${error.message}`);
  // Set exit code instead of forcefully exiting, allowing graceful shutdown of logging etc.
  process.exitCode = 1;
});
