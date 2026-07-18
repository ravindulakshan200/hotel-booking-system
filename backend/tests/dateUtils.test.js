const test = require("node:test");
const assert = require("node:assert/strict");

const { parseDateOnly, calculateNights, getTodayDateOnly } = require("../utils/dateUtils");

test("parseDateOnly accepts real ISO calendar dates", () => {
  assert.ok(parseDateOnly("2028-02-29"));
  assert.equal(parseDateOnly("2027-02-29"), null);
  assert.equal(parseDateOnly("29-02-2028"), null);
});

test("calculateNights returns the exact date-only difference", () => {
  assert.equal(calculateNights("2028-03-01", "2028-03-05"), 4);
  assert.equal(calculateNights("2028-03-05", "2028-03-05"), 0);
});

test("getTodayDateOnly returns YYYY-MM-DD for the configured timezone", () => {
  assert.match(getTodayDateOnly("Asia/Colombo"), /^\d{4}-\d{2}-\d{2}$/);
});
