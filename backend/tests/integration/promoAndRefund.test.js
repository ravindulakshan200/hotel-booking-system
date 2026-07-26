const test = require("node:test");
const assert = require("node:assert/strict");

const mockStripe = {
  refunds: {
    create: async () => {
      throw new Error("Stripe mock error"); // default behaviour, can override
    },
    list: async () => {
      return { data: [{ id: "re_mock_already_refunded" }] };
    }
  }
};
const originalRequire = require('module').prototype.require;
require('module').prototype.require = function (path) {
  if (path === 'stripe') return () => mockStripe;
  return originalRequire.apply(this, arguments);
};

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";
process.env.STRIPE_PAYMENTS_ENABLED = "true";
process.env.STRIPE_WEBHOOK_SECRET = "mock_wh";

const pool = require('../../config/db');
const createApp = require('../../app');
const generateToken = require('../../utils/generateToken');
const PromoCode = require('../../models/PromoCode');
const Booking = require('../../models/Booking');

let server;
let baseUrl;
let adminCookie;
let customerCookie;
let testRoomId;
let testHotelId;

test.before(async () => {
  // Clean up any test promo codes or bookings
  await pool.query("DELETE FROM payments WHERE transaction_reference LIKE 'TEST-%' OR transaction_reference LIKE 'DEMO-%' OR transaction_reference LIKE 'pi_%'");
  await pool.query("DELETE FROM bookings WHERE room_id IN (SELECT id FROM rooms WHERE room_number = 'T101')");
  await pool.query("DELETE FROM promo_codes WHERE code IN ('TESTPROMO', 'EXPIRYPROMO', 'CANCELPROMO', 'WEBHOOKPROMO', 'CONCURPROMO', 'PAIDBOOKPROMO')");
  await pool.query("DELETE FROM rooms WHERE room_number = 'T101'");
  await pool.query("DELETE FROM hotels WHERE name = 'TEST HOTEL'");

  // Seed hotel
  const [hotelResult] = await pool.query(
    "INSERT INTO hotels (name, address, city, description, image_url, status) VALUES ('TEST HOTEL', '123 Test St', 'Colombo', 'Test description', 'https://example.com/test.jpg', 'active')"
  );
  testHotelId = hotelResult.insertId;

  // Seed room
  const [roomResult] = await pool.query(
    "INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, capacity, availability_status) VALUES (?, 'T101', 'single', 25000.00, 1, 'available')",
    [testHotelId]
  );
  testRoomId = roomResult.insertId;

  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Generate tokens
  adminCookie = `jwt=${generateToken(1)}`;
  customerCookie = `jwt=${generateToken(2)}`;
});

test.after(async () => {
  if (server && server.closeAllConnections) {
    try { server.closeAllConnections(); } catch (e) {}
  }
  try {
    await new Promise((resolve) => server.close(resolve));
  } catch (e) {}

  // Safe teardown
  try {
    await pool.query("DELETE FROM payments WHERE transaction_reference LIKE 'TEST-%' OR transaction_reference LIKE 'DEMO-%'");
  } catch (e) {}
  try {
    await pool.query("DELETE FROM bookings WHERE total_price = 22500.00 OR total_price = 25000.00 OR total_price = 135000.00");
  } catch (e) {}
  try {
    await pool.query("DELETE FROM promo_codes WHERE code = 'TESTPROMO'");
  } catch (e) {}
  try {
    await pool.query("DELETE FROM rooms WHERE room_number = 'T101'");
  } catch (e) {}
  try {
    await pool.query("DELETE FROM hotels WHERE name = 'TEST HOTEL'");
  } catch (e) {}

  try {
    await pool.end();
  } catch (e) {}
});

test("Promo Codes & Refund Tracking Integration Tests", async (t) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  let testPromoId;

  await t.test("Admin can create a promo code", async () => {
    const res = await fetch(`${baseUrl}/api/v1/promos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie
      },
      body: JSON.stringify({
        code: "TESTPROMO",
        discount_type: "percentage",
        discount_value: 10,
        start_date: "2026-01-01",
        end_date: nextWeekStr,
        usage_limit: 5,
        min_booking_value: 1000,
        is_active: true,
        description: "Test discount code"
      })
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.promo.code, "TESTPROMO");
    testPromoId = body.data.promo.id;
  });

  await t.test("Customer can validate a valid promo code", async () => {
    const res = await fetch(`${baseUrl}/api/v1/promos/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": customerCookie
      },
      body: JSON.stringify({
        code: "TESTPROMO",
        booking_value: 25000.00
      })
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.discount_amount, "2500.00");
    assert.equal(body.data.final_amount, "22500.00");
  });

  await t.test("Validating an expired or invalid code returns error", async () => {
    const res = await fetch(`${baseUrl}/api/v1/promos/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": customerCookie
      },
      body: JSON.stringify({
        code: "NONEXISTENT",
        booking_value: 25000.00
      })
    });

    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.success, false);
  });

  let bookingId;

  await t.test("Customer can create a booking applying promo code", async () => {
    const roomId = testRoomId;
    const pricePerNight = 25000.00;

    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": customerCookie
      },
      body: JSON.stringify({
        room_id: roomId,
        check_in: tomorrowStr,
        check_out: nextWeekStr,
        promo_code: "TESTPROMO"
      })
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.booking.promo_code_id);
    bookingId = body.data.booking.id;

    // Verify discount is calculated on booking
    const booking = await Booking.findById(bookingId);
    const expectedOriginal = pricePerNight * 6; // 6 nights between tomorrow and next week
    const expectedDiscount = expectedOriginal * 0.1;
    const expectedFinal = expectedOriginal - expectedDiscount;

    assert.equal(Number(booking.original_amount), expectedOriginal);
    assert.equal(Number(booking.discount_amount), expectedDiscount);
    assert.equal(Number(booking.final_amount), expectedFinal);
    assert.equal(Number(booking.total_price), expectedFinal);
  });

  await t.test("Admin can update refund tracking details", async () => {
    // First, let's mark the booking as cancelled with refund required
    // Cancel the booking we just created
    const cancelRes = await fetch(`${baseUrl}/api/v1/bookings/${bookingId}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cookie": customerCookie
      },
      body: JSON.stringify({ reason: "No longer needing trip" })
    });
    assert.equal(cancelRes.status, 200);

    // Force refund_status to 'required' for the unpaid test booking to simulate a paid booking cancellation
    await pool.query("UPDATE bookings SET refund_status = 'required' WHERE id = ?", [bookingId]);

    // Update refund status to processing
    const res = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie
      },
      body: JSON.stringify({
        refund_status: "processing",
        refund_provider_reference: "REF-STRIPE-12345",
        refund_reason: "Customer cancellation request",
        refund_admin_notes: "Stripe transaction refund requested via dashboard"
      })
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.booking.refund_status, "processing");
    assert.equal(body.data.booking.refund_provider_reference, "REF-STRIPE-12345");

    // 1. Transition to completed WITHOUT provider reference should fail (we pass an empty/null ref)
    const failCompletedRes = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie
      },
      body: JSON.stringify({
        refund_status: "completed",
        refund_provider_reference: "" // Empty reference should be rejected
      })
    });
    assert.equal(failCompletedRes.status, 400);

    // 2. Transition to completed WITH provider reference should succeed
    const successCompletedRes = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie
      },
      body: JSON.stringify({
        refund_status: "completed",
        refund_provider_reference: "REF-COMPLETED-12345"
      })
    });
    assert.equal(successCompletedRes.status, 200);
    const completedBody = await successCompletedRes.json();
    assert.equal(completedBody.data.booking.refund_status, "completed");

    // 3. Changing status after completed should fail
    const changeAfterCompletedRes = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie
      },
      body: JSON.stringify({
        refund_status: "failed"
      })
    });
    assert.equal(changeAfterCompletedRes.status, 400);
  });

  await t.test("Expiry releases promo code reservation", async () => {
    const promoCode = "EXPIRYPROMO";
    await pool.query("DELETE FROM promo_codes WHERE code = ?", [promoCode]);
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, times_reserved)
       VALUES (?, 'fixed', 500.00, '2026-07-25', '2026-08-30', 2, 0, 0)`,
      [promoCode]
    );

    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": customerCookie
      },
      body: JSON.stringify({
        room_id: testRoomId,
        check_in: "2026-08-01",
        check_out: "2026-08-04",
        promo_code: promoCode
      })
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    const bookingId = body.data.booking.id;

    const [promoBefore] = await pool.query("SELECT times_reserved FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promoBefore[0].times_reserved, 1);

    await pool.query("UPDATE bookings SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?", [bookingId]);

    await Booking.expirePendingBookings();

    const [bookingAfter] = await pool.query("SELECT booking_status, promo_reserved FROM bookings WHERE id = ?", [bookingId]);
    assert.equal(bookingAfter[0].booking_status, "expired");
    assert.equal(bookingAfter[0].promo_reserved, 0);

    const [promoAfter] = await pool.query("SELECT times_reserved FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promoAfter[0].times_reserved, 0);
  });

  await t.test("Cancellation releases promo reservation (pending) and usage (confirmed)", async () => {
    const promoCode = "CANCELPROMO";
    await pool.query("DELETE FROM promo_codes WHERE code = ?", [promoCode]);
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, times_reserved)
       VALUES (?, 'fixed', 500.00, '2026-07-25', '2026-08-30', 2, 0, 0)`,
      [promoCode]
    );

    const res1 = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie },
      body: JSON.stringify({ room_id: testRoomId, check_in: "2026-08-05", check_out: "2026-08-08", promo_code: promoCode })
    });
    const body1 = await res1.json();
    const bookingId1 = body1.data.booking.id;

    let [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_reserved, 1);

    const cancelRes1 = await fetch(`${baseUrl}/api/v1/bookings/${bookingId1}/cancel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie }
    });
    assert.equal(cancelRes1.status, 200);

    [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_reserved, 0);

    const res2 = await fetch(`${baseUrl}/api/v1/bookings/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie },
      body: JSON.stringify({ room_id: testRoomId, check_in: "2026-08-08", check_out: "2026-08-11", payment_method: "cash", promo_code: promoCode })
    });
    assert.equal(res2.status, 201);
    const body2 = await res2.json();
    const bookingId2 = body2.data.booking.id;

    [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_used, 1);

    const cancelRes2 = await fetch(`${baseUrl}/api/v1/bookings/${bookingId2}/cancel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie }
    });
    assert.equal(cancelRes2.status, 200);

    [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_used, 0);
  });

  await t.test("Stripe webhook confirmation and duplicate idempotency", async () => {
    const promoCode = "WEBHOOKPROMO";
    await pool.query("DELETE FROM promo_codes WHERE code = ?", [promoCode]);
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, times_reserved)
       VALUES (?, 'fixed', 500.00, '2026-07-25', '2026-08-30', 2, 0, 0)`,
      [promoCode]
    );

    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie },
      body: JSON.stringify({ room_id: testRoomId, check_in: "2026-08-11", check_out: "2026-08-14", promo_code: promoCode })
    });
    const body = await res.json();
    const bookingId = body.data.booking.id;

    const Payment = require("../../models/Payment");
    const paymentId = await Payment.processAtomic({
      bookingId,
      paymentMethod: "card",
      actorUserId: 2,
      isAdmin: false,
      transactionReference: "pi_test_idempotent_123"
    });
    assert.ok(paymentId);

    let [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_reserved, 0);
    assert.equal(promo[0].times_used, 1);

    await assert.rejects(async () => {
      await Payment.processAtomic({
        bookingId,
        paymentMethod: "card",
        actorUserId: 2,
        isAdmin: false,
        transactionReference: "pi_test_idempotent_123"
      });
    }, /Only pending bookings can be paid|already been paid/);

    [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_used, 1);
  });

  await t.test("Authorization: non-admin cannot access admin refund", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/bookings/1/refund`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie },
      body: JSON.stringify({ refund_status: "processing" })
    });
    assert.equal(res.status, 403);
  });

  await t.test("Stripe refund failure updates status to failed", async () => {
    const [bookingResult] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, booking_status, refund_status)
       VALUES (2, ?, '2026-09-01', '2026-09-05', 50000.00, 'cancelled', 'required')`,
      [testRoomId]
    );
    const bookingId = bookingResult.insertId;

    await pool.query(
      `INSERT INTO payments (booking_id, payment_method, amount, payment_status, transaction_reference)
       VALUES (?, 'card', 50000.00, 'completed', 'pi_refund_fail_test')`,
      [bookingId]
    );

    mockStripe.refunds.create = async () => {
      throw new Error("Stripe mock decline error");
    };

    const res = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/refund`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": adminCookie },
      body: JSON.stringify({ refund_status: "processing", refund_reason: "API fail test" })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Stripe Refund API error/);

    const [booking] = await pool.query("SELECT refund_status, refund_reason FROM bookings WHERE id = ?", [bookingId]);
    assert.equal(booking[0].refund_status, "failed");
    assert.equal(booking[0].refund_reason, "Stripe mock decline error");
  });

  await t.test("charge.refunded webhook confirmation", async () => {
    const [bookingResult] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, booking_status, refund_status)
       VALUES (2, ?, '2026-09-10', '2026-09-15', 50000.00, 'cancelled', 'processing')`,
      [testRoomId]
    );
    const bookingId = bookingResult.insertId;

    await pool.query(
      `INSERT INTO payments (booking_id, payment_method, amount, payment_status, transaction_reference)
       VALUES (?, 'card', 50000.00, 'completed', 'pi_webhook_refund_success')`,
      [bookingId]
    );

    mockStripe.webhooks = {
      constructEvent: () => ({
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_webhook_refund_success",
            refunds: {
              data: [{ id: "re_webhook_success_123" }]
            }
          }
        }
      })
    };

    const res = await fetch(`${baseUrl}/api/v1/payments/stripe/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "mock_sig"
      },
      body: JSON.stringify({ mock: "payload" })
    });

    assert.equal(res.status, 200);

    const [booking] = await pool.query("SELECT refund_status, refund_provider_reference FROM bookings WHERE id = ?", [bookingId]);
    assert.equal(booking[0].refund_status, "completed");
    assert.equal(booking[0].refund_provider_reference, "re_webhook_success_123");
  });

  await t.test("Concurrent last-usage: only one checkout reservation succeeds when limit is 1", async () => {
    const promoCode = "CONCURPROMO";
    await pool.query("DELETE FROM promo_codes WHERE code = ?", [promoCode]);
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, times_reserved)
       VALUES (?, 'fixed', 500.00, '2026-07-25', '2026-08-30', 1, 0, 0)`,
      [promoCode]
    );

    // Prepare 5 concurrent booking creation promises on non-overlapping dates
    const dates = [
      ["2026-08-15", "2026-08-16"],
      ["2026-08-16", "2026-08-17"],
      ["2026-08-17", "2026-08-18"],
      ["2026-08-18", "2026-08-19"],
      ["2026-08-19", "2026-08-20"]
    ];

    const promises = dates.map(([check_in, check_out]) =>
      fetch(`${baseUrl}/api/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": customerCookie },
        body: JSON.stringify({
          room_id: testRoomId,
          check_in,
          check_out,
          promo_code: promoCode
        })
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status);

    const successCount = statuses.filter(s => s === 201).length;
    const failCount = statuses.filter(s => s === 400).length;

    assert.equal(successCount, 1);
    assert.equal(failCount, 4);

    const [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_reserved, 1);
    assert.equal(promo[0].times_used, 0);
  });

  await t.test("Paid-booking: confirms booking status and finalizes promo reservation", async () => {
    const promoCode = "PAIDBOOKPROMO";
    await pool.query("DELETE FROM promo_codes WHERE code = ?", [promoCode]);
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, start_date, end_date, usage_limit, times_used, times_reserved)
       VALUES (?, 'fixed', 500.00, '2026-07-25', '2026-08-30', 5, 0, 0)`,
      [promoCode]
    );

    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": customerCookie },
      body: JSON.stringify({ room_id: testRoomId, check_in: "2026-08-21", check_out: "2026-08-24", promo_code: promoCode })
    });
    const body = await res.json();
    const bookingId = body.data.booking.id;

    let [booking] = await pool.query("SELECT booking_status, promo_reserved FROM bookings WHERE id = ?", [bookingId]);
    assert.equal(booking[0].booking_status, "pending");
    assert.equal(booking[0].promo_reserved, 1);

    const Payment = require("../../models/Payment");
    await Payment.processAtomic({
      bookingId,
      paymentMethod: "online",
      actorUserId: 2,
      isAdmin: false,
      transactionReference: "pi_paid_book_test_123"
    });

    [booking] = await pool.query("SELECT booking_status, promo_reserved FROM bookings WHERE id = ?", [bookingId]);
    assert.equal(booking[0].booking_status, "confirmed");
    assert.equal(booking[0].promo_reserved, 0);

    const [promo] = await pool.query("SELECT times_reserved, times_used FROM promo_codes WHERE code = ?", [promoCode]);
    assert.equal(promo[0].times_reserved, 0);
    assert.equal(promo[0].times_used, 1);
  });
});
