const test = require("node:test");
const assert = require("node:assert/strict");

const errorHandler = require("../../middleware/errorHandler");

test("errorHandler: sanitized production error logging", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  let loggedOutput = null;

  try {
    process.env.NODE_ENV = "production";
    console.error = (label, data) => {
      if (label === "❌ Production Error:") {
        loggedOutput = data;
      }
    };

    const mockError = new Error("Database connection failed");
    mockError.code = "ECONNREFUSED";
    mockError.name = "DatabaseError";
    // We add sensitive stack data to verify it is NOT logged
    mockError.stack = "Error: Database connection failed\\n  at doBadThing (/app/secret/credentials.js:42:1)";

    const mockReq = {
      method: "GET",
      path: "/api/v1/hotels"
    };

    let responseStatus = null;
    let responseBody = null;
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };

    const mockNext = () => {};

    // Execute handler
    errorHandler(mockError, mockReq, mockRes, mockNext);

    // Verify response is generic
    assert.equal(responseStatus, 500);
    assert.equal(responseBody.message, "Internal Server Error");
    assert.equal(responseBody.stack, undefined); // Stack trace is hidden in production

    // Verify sanitized logging occurred
    assert.notEqual(loggedOutput, null, "Expected sanitized error to be logged");
    assert.equal(loggedOutput.name, "DatabaseError");
    assert.equal(loggedOutput.code, "ECONNREFUSED");
    assert.equal(loggedOutput.method, "GET");
    assert.equal(loggedOutput.path, "/api/v1/hotels");
    assert.equal(loggedOutput.message, undefined); // Message is intentionally omitted for safety
    assert.equal(loggedOutput.stack, undefined); // Stack trace is intentionally omitted

  } finally {
    process.env.NODE_ENV = originalEnv;
    console.error = originalConsoleError;
  }
});
