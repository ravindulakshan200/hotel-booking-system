const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateRegisterInput,
  validateProfileInput,
  validatePasswordChangeInput,
  validateBookingInput,
} = require("../utils/validators");
const { parseDateOnly, getTodayDateOnly } = require("../utils/dateUtils");

const addDays = (dateOnly, days) => {
  const date = parseDateOnly(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

test("registration accepts normalized, strong customer data", () => {
  const result = validateRegisterInput({
    first_name: "Ravindu",
    last_name: "Lakshan",
    email: "ravindu@example.com",
    password: "Hotel123",
    phone: "+94 77 123 4567",
  });
  assert.equal(result.valid, true);
});

test("registration rejects weak passwords and malformed values", () => {
  const result = validateRegisterInput({
    first_name: 42,
    last_name: "",
    email: "invalid",
    password: "short",
    phone: "abc",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 5);
});

test("registration rejects passwords beyond bcrypt's safe input limit", () => {
  const result = validateRegisterInput({
    first_name: "Ravindu",
    last_name: "Lakshan",
    email: "ravindu@example.com",
    password: `Hotel123${"x".repeat(80)}`,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("72 UTF-8 bytes")));
});

test("profile validation safely rejects non-string names", () => {
  const result = validateProfileInput({ first_name: 123 });
  assert.equal(result.valid, false);
});

test("password change requires a different strong password", () => {
  const result = validatePasswordChangeInput({
    current_password: "Hotel123",
    new_password: "Hotel123",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("different")));
});

test("booking validation accepts future dates", () => {
  const today = getTodayDateOnly();
  const result = validateBookingInput({
    room_id: 1,
    check_in: addDays(today, 1),
    check_out: addDays(today, 3),
  });
  assert.equal(result.valid, true);
});

test("booking validation rejects past and reversed dates", () => {
  const today = getTodayDateOnly();
  const result = validateBookingInput({
    room_id: "invalid",
    check_in: addDays(today, -2),
    check_out: addDays(today, -3),
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});
