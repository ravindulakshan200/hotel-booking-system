const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";

const pool = require("../config/db");
const createApp = require("../app");
const { getTodayDateOnly } = require("../utils/dateUtils");

let server;
let baseUrl;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("Availability search API", async (t) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  await t.test("valid availability search", async () => {
    const response = await fetch(`${baseUrl}/api/v1/hotels/availability?check_in=${tomorrowStr}&check_out=${nextWeekStr}&guests=2&city=Colombo`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.hotels);
  });

  await t.test("invalid/past/reversed dates", async () => {
    const pastDate = "2020-01-01";
    const res = await fetch(`${baseUrl}/api/v1/hotels/availability?check_in=${pastDate}&check_out=${nextWeekStr}&guests=2`);
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.ok(body.errors.includes("check_in cannot be in the past"));

    const resReversed = await fetch(`${baseUrl}/api/v1/hotels/availability?check_in=${nextWeekStr}&check_out=${tomorrowStr}&guests=2`);
    const bodyReversed = await resReversed.json();
    assert.equal(resReversed.status, 400);
    assert.ok(bodyReversed.errors.includes("check_out must be after check_in"));
  });

  await t.test("invalid guest and price filters", async () => {
    const res = await fetch(`${baseUrl}/api/v1/hotels/availability?check_in=${tomorrowStr}&check_out=${nextWeekStr}&guests=25`);
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.ok(body.errors.includes("guests must be an integer between 1 and 20"));

    const resPrice = await fetch(`${baseUrl}/api/v1/hotels/availability?check_in=${tomorrowStr}&check_out=${nextWeekStr}&guests=2&min_price=-5`);
    const bodyPrice = await resPrice.json();
    assert.equal(resPrice.status, 400);
    assert.ok(bodyPrice.errors.includes("min_price must be a positive number"));
  });

  await t.test("getAllRooms with date filters", async () => {
    const res = await fetch(`${baseUrl}/api/v1/rooms?hotel_id=1&check_in=${tomorrowStr}&check_out=${nextWeekStr}&guests=2`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.rooms));
    if (body.data.rooms.length > 0) {
      assert.ok('is_available' in body.data.rooms[0]);
    }
  });

});
