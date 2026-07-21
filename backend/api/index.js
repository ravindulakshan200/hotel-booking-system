const createApp = require("../app");
const { validateEnvironment } = require("../config/env");

// Cold start initialization
validateEnvironment();

// Create and export the Express app for Vercel's serverless environment.
// We do NOT call app.listen() here. Vercel handles the HTTP listener automatically.
const app = createApp();

module.exports = app;
