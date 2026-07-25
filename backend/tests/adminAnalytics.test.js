const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

// adminAnalytics.test.js runs last in its own subprocess.
const pool = require("../config/db");
const createApp = require("../app");
const generateToken = require("../utils/generateToken");

let server;
let baseUrl;
let adminToken;
let customerToken;
let queryCalls = [];
let mockEmptyResults = false;

const originalQuery = pool.query.bind(pool);

test.before(async () => {
  pool.query = async (sql, params) => {
    const s = sql.replace(/\s+/g, " ").trim();
    queryCalls.push({ sql: s, params });

    // Mock user fetching for Auth Middleware
    if (s.includes("SELECT id, first_name, last_name, email, phone, role, created_at, email_verified_at, password_changed_at FROM users WHERE id = ?")) {
      const id = params[0];
      if (id === 1) return [[{ id: 1, role: "admin", email_verified_at: "2025-01-01" }]];
      if (id === 2) return [[{ id: 2, role: "customer", email_verified_at: "2025-01-01" }]];
      return [[]];
    }

    if (s.includes("SELECT (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_users")) {
      if (mockEmptyResults) {
        return [[{
          total_users: 0, total_hotels: 0, total_rooms: 0, total_bookings: 0,
          pending_bookings: 0, confirmed_bookings: 0, completed_bookings: 0, cancelled_bookings: 0,
          total_revenue: 0, period_revenue: 0, avg_booking_value: 0
        }]];
      }
      return [[{
        total_users: 10, total_hotels: 2, total_rooms: 20, total_bookings: 15,
        pending_bookings: 2, confirmed_bookings: 5, completed_bookings: 6, cancelled_bookings: 2,
        total_revenue: 15000, period_revenue: 5000, avg_booking_value: 200
      }]];
    }

    if (s.includes("AS occupied_room_nights")) {
      return [[{ occupied_room_nights: mockEmptyResults ? 0 : 50 }]];
    }

    if (s.includes("label, COUNT(*) AS bookings")) {
      return [mockEmptyResults ? [] : [{ label: "2026-07-25", bookings: 2, revenue: 400 }]];
    }

    if (s.includes("booking_status AS name, COUNT(*) AS value")) {
      return [mockEmptyResults ? [] : [{ name: "confirmed", value: 5 }]];
    }

    if (s.includes("SELECT h.name, COUNT(b.id) AS bookings")) {
      return [mockEmptyResults ? [] : [{ name: "Grand", bookings: 3 }]];
    }

    if (s.includes("SELECT b.id, b.check_in, b.check_out")) {
      return [mockEmptyResults ? [] : [{
        id: 1, check_in: "2026-01-01", check_out: "2026-01-05", total_price: "500",
        booking_status: "confirmed", created_at: "2026-01-01",
        first_name: "John", last_name: "Doe", hotel_name: "Grand", room_number: "101"
      }]];
    }

    throw new Error("Unexpected SQL in mock: " + s);
  };

  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Seed data mock: user ID 1 = admin, user ID 2 = customer
  adminToken = generateToken(1);
  customerToken = generateToken(2);
});

test.after(async () => {
  pool.query = originalQuery;
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test.afterEach(() => {
  queryCalls = [];
  mockEmptyResults = false;
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

  // ── Empty analytics results ───────────────────────────────────────────────
  await t.test("empty analytics results structure handles 0 gracefully", async () => {
    mockEmptyResults = true;
    const res = await fetch(`${baseUrl}/api/v1/admin/dashboard?period=30days`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.overview.total_bookings, 0);
    assert.equal(body.data.overview.occupancy_rate, 0);
    assert.equal(body.data.charts.bookingTrend.length, 0);
    assert.equal(body.data.recentBookings.length, 0);
  });

  // ── Phase 3 SQL correctness verification ──────────────────────────────────
  await t.test("Phase 3 SQL query correctness for booking lifecycle", async () => {
    // Make a request so queryCalls is populated
    await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const overviewCall = queryCalls.find(c => c.sql.includes("total_users"));
    assert.ok(overviewCall.sql.includes("booking_status IN ('completed', 'checked_out')"), "SQL missing checked_out in completed bookings count");
    assert.ok(overviewCall.sql.includes("NOT (b.booking_status = 'cancelled' AND b.refund_status IN ('required', 'processing', 'completed'))"), "SQL missing refund exclusion from revenue");
    assert.ok(overviewCall.sql.includes("p.payment_status = 'completed'"), "SQL missing payment_status=completed check");

    const occupancyCall = queryCalls.find(c => c.sql.includes("occupied_room_nights"));
    assert.ok(occupancyCall.sql.includes("booking_status IN ('confirmed', 'completed', 'checked_in', 'checked_out')"), "SQL missing checked statuses in occupancy");
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
