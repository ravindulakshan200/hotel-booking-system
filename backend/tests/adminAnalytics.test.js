const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";

// adminAnalytics.test.js runs last in its own subprocess (see package.json).
// pool.end() here drains the shared MySQL pool so the subprocess exits cleanly.
const pool = require("../config/db");
const createApp = require("../app");
const generateToken = require("../utils/generateToken");

let server;
let baseUrl;
let adminToken;
let customerToken;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Seed data: user ID 1 = admin, user ID 2 = customer
  adminToken = generateToken(1);
  customerToken = generateToken(2);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("Admin Analytics API", async (t) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  await t.test("unauthenticated request returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`);
    assert.equal(res.status, 401);
  });

  await t.test("non-admin (customer) request returns 403", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(res.status, 403);
  });

  // ── Invalid period ────────────────────────────────────────────────────────
  await t.test("invalid period value returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard?period=invalid`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  });

  // ── All valid periods return correct structure ─────────────────────────────
  for (const period of ["7days", "30days", "6months", "12months", "all"]) {
    await t.test(`period=${period} returns 200 with valid structure`, async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 200, `Expected 200 for period=${period}`);
      assert.equal(body.success, true);

      // Overview shape
      const ov = body.data.overview;
      assert.ok(typeof ov === "object" && ov !== null, "overview must be an object");
      assert.ok("total_users" in ov, "overview.total_users missing");
      assert.ok("total_rooms" in ov, "overview.total_rooms missing");
      assert.ok("total_bookings" in ov, "overview.total_bookings missing");
      assert.ok("period_revenue" in ov, "overview.period_revenue missing");

      // Revenue is numeric and non-negative
      const revenue = Number(ov.period_revenue);
      assert.ok(!Number.isNaN(revenue), "period_revenue must be numeric");
      assert.ok(revenue >= 0, "period_revenue must be >= 0");

      // Occupancy is numeric and clamped [0, 100]
      const occ = Number(ov.occupancy_rate);
      assert.ok(!Number.isNaN(occ), "occupancy_rate must be numeric");
      assert.ok(occ >= 0, "occupancy_rate must be >= 0");
      assert.ok(occ <= 100, "occupancy_rate must be <= 100");

      // Charts
      assert.ok(body.data.charts, "charts object missing");
      assert.ok(Array.isArray(body.data.charts.bookingTrend), "charts.bookingTrend must be array");
      assert.ok(Array.isArray(body.data.charts.statusBreakdown), "charts.statusBreakdown must be array");
      assert.ok(Array.isArray(body.data.charts.popularHotels), "charts.popularHotels must be array");

      // Recent bookings — safe fields only
      assert.ok(Array.isArray(body.data.recentBookings), "recentBookings must be array");
      for (const b of body.data.recentBookings) {
        assert.ok("id" in b, "booking.id missing");
        assert.ok("guest_name" in b, "booking.guest_name missing");
        assert.ok("hotel_name" in b, "booking.hotel_name missing");
        assert.ok("status" in b, "booking.status missing");
        // Sensitive fields must NOT be present
        assert.equal(b.password, undefined, "booking must not expose password");
        assert.equal(b.email, undefined, "booking must not expose email");
      }
    });
  }

  // ── Default period (no param) ─────────────────────────────────────────────
  await t.test("omitting period defaults to 30days and returns 200", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
  });

  // ── /analytics alias (backward compat) ───────────────────────────────────
  await t.test("/analytics alias returns same shape as /dashboard", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/analytics?period=30days`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.overview, "analytics alias must return overview");
    assert.ok(body.data.charts, "analytics alias must return charts");
    assert.ok(Array.isArray(body.data.recentBookings), "analytics alias must return recentBookings");
  });
});
