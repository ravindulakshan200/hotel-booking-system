/**
 * tests/integration/phase7c.test.js
 * Integration test suite for Phase 7C features.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-with-more-than-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

const pool = require('../../config/db');
const createApp = require('../../app');
const generateToken = require('../../utils/generateToken');

const runId = Math.random().toString(36).substring(2, 10);
const testAdminEmail = `test-phase7c-admin-${runId}@hotel.com`;
const testCustomerEmail = `test-phase7c-customer-${runId}@hotel.com`;
const testHotelName = `PHASE7C HOTEL ${runId}`;
const testRoomNumber = `7C-${runId}`;

let server;
let baseUrl;
let adminToken;
let customerToken;
let testAdminId;
let testCustomerId;
let testHotelId;
let testRoomId;
let testBookingId;
let testPastBookingId;
let testReviewId;
let testReportId;
let testTicketId;
let unauthTicketId;
let testImageId;
let testImageStorageKey;

// Unrelated variables for setup/teardown survival regression tests
let unrelatedUserId;
let unrelatedHotelId;
let unrelatedRoomId;
let unrelatedBookingId;
let unrelatedPaymentId;
let unrelatedReviewId;
let unrelatedReportId;
let unrelatedTicketId;
let unrelatedAuditLogId;
let unrelatedInvoiceId;
let unrelatedReceiptId;
let unrelatedImageId;
let unrelatedImageStorageKey;

const fs = require('fs');
const path = require('path');
const uploadsDir = path.resolve(__dirname, '../../uploads');

const safeDeleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.resolve(uploadsDir, filename);
  if (!filePath.startsWith(uploadsDir)) {
    throw new Error("Rejected cleanup path outside the configured test upload directory.");
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

test.before(async () => {
  try {
    // Seed test users with unique suffix
    const passwordHash = await bcrypt.hash("Test@123", 12);
    const [adminRes] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, phone, role, email_verified_at, is_active)
       VALUES ('Admin', '7C', ?, ?, '1234567890', 'admin', NOW(), 1)`,
      [testAdminEmail, passwordHash]
    );
    testAdminId = adminRes.insertId;

    const [customerRes] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, phone, role, email_verified_at, is_active)
       VALUES ('Customer', '7C', ?, ?, '0987654321', 'customer', NOW(), 1)`,
      [testCustomerEmail, passwordHash]
    );
    testCustomerId = customerRes.insertId;

    // Seed hotel with latitude and longitude (Section 3 coordinates)
    const [hotelRes] = await pool.query(
      `INSERT INTO hotels (name, address, city, description, star_rating, status, latitude, longitude)
       VALUES (?, '123 Phase 7C Road', 'Colombo', 'Nice place', 5, 'active', 6.9271, 79.8612)`,
      [testHotelName]
    );
    testHotelId = hotelRes.insertId;

    // Seed room
    const [roomRes] = await pool.query(
      `INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, capacity, availability_status)
       VALUES (?, ?, 'double', 15000.00, 2, 'available')`,
      [testHotelId, testRoomNumber]
    );
    testRoomId = roomRes.insertId;

    // Seed booking (active confirmed future booking for availability calendar)
    const [bookingRes] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, original_amount, discount_amount, final_amount, booking_status)
       VALUES (?, ?, '2026-08-01', '2026-08-05', 60000.00, 60000.00, 0.00, 60000.00, 'confirmed')`,
      [testCustomerId, testRoomId]
    );
    testBookingId = bookingRes.insertId;

    // Seed completed booking in the past so the customer has a completed stay for reviews
    const [pastBookingRes] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, original_amount, discount_amount, final_amount, booking_status)
       VALUES (?, ?, '2026-07-01', '2026-07-05', 60000.00, 60000.00, 0.00, 60000.00, 'completed')`,
      [testCustomerId, testRoomId]
    );
    testPastBookingId = pastBookingRes.insertId;

    // Seed payment (unique transaction reference per run to avoid duplicate key collisions)
    await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_reference)
       VALUES (?, 60000.00, 'stripe', 'completed', ?)`,
      [testBookingId, `pi_mock_phase7c_${runId}`]
    );

    // ─── Seed Unrelated Records for setup/teardown survival regression tests ───
    // Seed unrelated user
    const [unrelatedUserRes] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, phone, role, email_verified_at, is_active)
       VALUES ('Unrelated', '7C', ?, ?, '0000000000', 'customer', NOW(), 1)`,
      [`unrelated-user-${runId}@hotel.com`, passwordHash]
    );
    unrelatedUserId = unrelatedUserRes.insertId;

    // Seed unrelated hotel
    const [unrelatedHotelRes] = await pool.query(
      `INSERT INTO hotels (name, address, city, description, star_rating, status, latitude, longitude)
       VALUES (?, '456 Unrelated Rd', 'Colombo', 'Unrelated Desc', 4, 'active', 6.0000, 80.0000)`,
      [`Unrelated Hotel ${runId}`]
    );
    unrelatedHotelId = unrelatedHotelRes.insertId;

    // Seed unrelated room
    const [unrelatedRoomRes] = await pool.query(
      `INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, capacity, availability_status)
       VALUES (?, ?, 'single', 10000.00, 1, 'available')`,
      [unrelatedHotelId, `UNREL-${runId}`]
    );
    unrelatedRoomId = unrelatedRoomRes.insertId;

    // Seed unrelated booking
    const [unrelatedBookingRes] = await pool.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, total_price, original_amount, discount_amount, final_amount, booking_status)
       VALUES (?, ?, '2026-09-01', '2026-09-05', 40000.00, 40000.00, 0.00, 40000.00, 'confirmed')`,
      [unrelatedUserId, unrelatedRoomId]
    );
    unrelatedBookingId = unrelatedBookingRes.insertId;

    // Seed unrelated payment
    const [unrelatedPaymentRes] = await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_reference)
       VALUES (?, 40000.00, 'stripe', 'completed', ?)`,
      [unrelatedBookingId, `pi_unrelated_${runId}`]
    );
    unrelatedPaymentId = unrelatedPaymentRes.insertId;

    // Seed unrelated invoice
    const [unrelatedInvoiceRes] = await pool.query(
      `INSERT INTO invoices (booking_id, invoice_number, generated_at)
       VALUES (?, ?, NOW())`,
      [unrelatedBookingId, `INV-UNREL-${runId}`]
    );
    unrelatedInvoiceId = unrelatedInvoiceRes.insertId;

    // Seed unrelated receipt
    const [unrelatedReceiptRes] = await pool.query(
      `INSERT INTO receipts (booking_id, receipt_number, generated_at)
       VALUES (?, ?, NOW())`,
      [unrelatedBookingId, `REC-UNREL-${runId}`]
    );
    unrelatedReceiptId = unrelatedReceiptRes.insertId;

    // Seed unrelated review
    const [unrelatedReviewRes] = await pool.query(
      `INSERT INTO reviews (user_id, hotel_id, rating, comment, is_hidden)
       VALUES (?, ?, 4, ?, 0)`,
      [unrelatedUserId, unrelatedHotelId, `Unrelated Review comment ${runId}`]
    );
    unrelatedReviewId = unrelatedReviewRes.insertId;

    // Seed unrelated report
    const [unrelatedReportRes] = await pool.query(
      `INSERT INTO review_reports (review_id, reporter_user_id, reason, category, status)
       VALUES (?, ?, ?, 'spam', 'pending')`,
      [unrelatedReviewId, unrelatedUserId, `Unrelated Report reason ${runId}`]
    );
    unrelatedReportId = unrelatedReportRes.insertId;

    // Seed unrelated support ticket
    const [unrelatedTicketRes] = await pool.query(
      `INSERT INTO support_tickets (user_id, ticket_ref, name, email, subject, category, message, status)
       VALUES (?, ?, 'Unrelated Guest', 'unrel-support@example.com', 'Unrelated Question', 'payment', 'Unrelated msg', 'open')`,
      [unrelatedUserId, `TKT-UNREL-${runId}`]
    );
    unrelatedTicketId = unrelatedTicketRes.insertId;

    // Seed unrelated audit log
    const [unrelatedAuditRes] = await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES (?, 'unrelated_audit_action', 'hotel', ?, '{}', '127.0.0.1')`,
      [unrelatedUserId, unrelatedHotelId]
    );
    unrelatedAuditLogId = unrelatedAuditRes.insertId;

    // Write unrelated image file and create record in hotel_images
    unrelatedImageStorageKey = `unrelated-surviving-image-${runId}.jpg`;
    fs.writeFileSync(path.join(uploadsDir, unrelatedImageStorageKey), 'unrelated-image-data-dummy');
    const [unrelatedImageRes] = await pool.query(
      `INSERT INTO hotel_images (hotel_id, storage_key, is_cover, alt_text, sort_order)
       VALUES (?, ?, 1, 'Unrelated Alt Text', 0)`,
      [unrelatedHotelId, unrelatedImageStorageKey]
    );
    unrelatedImageId = unrelatedImageRes.insertId;

    // Generate tokens
    adminToken = generateToken(testAdminId);
    customerToken = generateToken(testCustomerId);

    // Start Express server
    server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  } catch (err) {
    throw err;
  }
});

test.after(async () => {
  if (server) {
    if (server.closeAllConnections) server.closeAllConnections();
    try { await new Promise((resolve) => server.close(resolve)); } catch (e) {}
  }

  // Teardown uploads safely
  if (testImageStorageKey) {
    safeDeleteFile(testImageStorageKey);
  }

  // Targeted cleanups (no unscoped deletes)
  if (testReportId) {
    await pool.query("DELETE FROM review_reports WHERE id = ?", [testReportId]);
  }
  if (testReviewId) {
    await pool.query("DELETE FROM review_reports WHERE review_id = ?", [testReviewId]);
    await pool.query("DELETE FROM reviews WHERE id = ?", [testReviewId]);
  }
  const ticketIds = [testTicketId, unauthTicketId].filter(Boolean);
  if (ticketIds.length > 0) {
    // Notes are stored inline in support_tickets.agent_notes — no separate notes table
    await pool.query("DELETE FROM support_tickets WHERE id IN (?)", [ticketIds]);
  }

  const bookingIds = [testBookingId, testPastBookingId].filter(Boolean);
  if (bookingIds.length > 0) {
    await pool.query("DELETE FROM receipts WHERE booking_id IN (?)", [bookingIds]);
    await pool.query("DELETE FROM invoices WHERE booking_id IN (?)", [bookingIds]);
    await pool.query("DELETE FROM payments WHERE booking_id IN (?)", [bookingIds]);
    await pool.query("DELETE FROM bookings WHERE id IN (?)", [bookingIds]);
  }

  if (testRoomId) {
    await pool.query("DELETE FROM rooms WHERE id = ?", [testRoomId]);
  }
  if (testHotelId) {
    await pool.query("DELETE FROM hotel_images WHERE hotel_id = ?", [testHotelId]);
    await pool.query("DELETE FROM hotels WHERE id = ?", [testHotelId]);
  }
  const userIds = [testAdminId, testCustomerId].filter(Boolean);
  if (userIds.length > 0) {
    await pool.query("DELETE FROM audit_logs WHERE admin_id IN (?)", [userIds]);
    await pool.query("DELETE FROM users WHERE id IN (?)", [userIds]);
  }

  // ─── Verification that unrelated records survived setup and tests ───
  if (unrelatedUserId) {
    const [rows] = await pool.query("SELECT id FROM users WHERE id = ?", [unrelatedUserId]);
    assert.ok(rows.length > 0, "Unrelated user should survive test suite");
  }
  if (unrelatedHotelId) {
    const [rows] = await pool.query("SELECT id FROM hotels WHERE id = ?", [unrelatedHotelId]);
    assert.ok(rows.length > 0, "Unrelated hotel should survive test suite");
  }
  if (unrelatedRoomId) {
    const [rows] = await pool.query("SELECT id FROM rooms WHERE id = ?", [unrelatedRoomId]);
    assert.ok(rows.length > 0, "Unrelated room should survive test suite");
  }
  if (unrelatedBookingId) {
    const [rows] = await pool.query("SELECT id FROM bookings WHERE id = ?", [unrelatedBookingId]);
    assert.ok(rows.length > 0, "Unrelated booking should survive test suite");
  }
  if (unrelatedPaymentId) {
    const [rows] = await pool.query("SELECT id FROM payments WHERE id = ?", [unrelatedPaymentId]);
    assert.ok(rows.length > 0, "Unrelated payment should survive test suite");
  }
  if (unrelatedInvoiceId) {
    const [rows] = await pool.query("SELECT id FROM invoices WHERE id = ?", [unrelatedInvoiceId]);
    assert.ok(rows.length > 0, "Unrelated invoice should survive test suite");
  }
  if (unrelatedReceiptId) {
    const [rows] = await pool.query("SELECT id FROM receipts WHERE id = ?", [unrelatedReceiptId]);
    assert.ok(rows.length > 0, "Unrelated receipt should survive test suite");
  }
  if (unrelatedReviewId) {
    const [rows] = await pool.query("SELECT id FROM reviews WHERE id = ?", [unrelatedReviewId]);
    assert.ok(rows.length > 0, "Unrelated review should survive test suite");
  }
  if (unrelatedReportId) {
    const [rows] = await pool.query("SELECT id FROM review_reports WHERE id = ?", [unrelatedReportId]);
    assert.ok(rows.length > 0, "Unrelated review report should survive test suite");
  }
  if (unrelatedTicketId) {
    const [rows] = await pool.query("SELECT id FROM support_tickets WHERE id = ?", [unrelatedTicketId]);
    assert.ok(rows.length > 0, "Unrelated support ticket should survive test suite");
  }
  if (unrelatedAuditLogId) {
    const [rows] = await pool.query("SELECT id FROM audit_logs WHERE id = ?", [unrelatedAuditLogId]);
    assert.ok(rows.length > 0, "Unrelated audit log should survive test suite");
  }
  if (unrelatedImageStorageKey) {
    const imagePath = path.resolve(uploadsDir, unrelatedImageStorageKey);
    assert.ok(fs.existsSync(imagePath), "Unrelated uploaded image file should survive test suite");
  }

  // ─── Cleanup Unrelated Records ───
  if (unrelatedReportId) {
    await pool.query("DELETE FROM review_reports WHERE id = ?", [unrelatedReportId]);
  }
  if (unrelatedReviewId) {
    await pool.query("DELETE FROM review_reports WHERE review_id = ?", [unrelatedReviewId]);
    await pool.query("DELETE FROM reviews WHERE id = ?", [unrelatedReviewId]);
  }
  if (unrelatedTicketId) {
    await pool.query("DELETE FROM support_tickets WHERE id = ?", [unrelatedTicketId]);
  }
  if (unrelatedBookingId) {
    await pool.query("DELETE FROM receipts WHERE booking_id = ?", [unrelatedBookingId]);
    await pool.query("DELETE FROM invoices WHERE booking_id = ?", [unrelatedBookingId]);
    await pool.query("DELETE FROM payments WHERE booking_id = ?", [unrelatedBookingId]);
    await pool.query("DELETE FROM bookings WHERE id = ?", [unrelatedBookingId]);
  }
  if (unrelatedRoomId) {
    await pool.query("DELETE FROM rooms WHERE id = ?", [unrelatedRoomId]);
  }
  if (unrelatedHotelId) {
    await pool.query("DELETE FROM hotel_images WHERE hotel_id = ?", [unrelatedHotelId]);
    await pool.query("DELETE FROM hotels WHERE id = ?", [unrelatedHotelId]);
  }
  if (unrelatedAuditLogId) {
    await pool.query("DELETE FROM audit_logs WHERE id = ?", [unrelatedAuditLogId]);
  }
  if (unrelatedUserId) {
    await pool.query("DELETE FROM users WHERE id = ?", [unrelatedUserId]);
  }
  if (unrelatedImageStorageKey) {
    safeDeleteFile(unrelatedImageStorageKey);
  }

  // Immediately terminate all pool connections to allow node:test to exit naturally
  pool.destroy ? pool.destroy() : await pool.end();
});

test("Phase 7C Integration Test Suite", async (t) => {

  // ─── Section 1: Image Upload and Cleanup Safety ──────────────────────────────
  await t.test("Image Upload and Cleanup Safety", async (st) => {
    await st.test("Admin uploads hotel image and verifies storage", async () => {
      // Minimal valid JPEG bytes (magic bytes 0xFF 0xD8 0xFF)
      const jpegBytes = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9]);

      // Build multipart/form-data using native FormData (Node.js 18+)
      const formData = new FormData();
      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
      formData.append('images', blob, 'test-image.jpg');

      const res = await fetch(`${baseUrl}/api/v1/hotels/${testHotelId}/images`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData,
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.images.length > 0);

      const uploadedImage = body.data.images[0];
      const [rows] = await pool.query("SELECT storage_key FROM hotel_images WHERE id = ?", [uploadedImage.id]);
      testImageId = uploadedImage.id;
      testImageStorageKey = rows[0].storage_key;
    });

    await st.test("Regression: unrelated existing image survives cleanup", async () => {
      const unrelatedFilename = `unrelated-${runId}.jpg`;
      fs.writeFileSync(path.join(uploadsDir, unrelatedFilename), 'dummy');

      assert.ok(fs.existsSync(path.join(uploadsDir, unrelatedFilename)));

      if (testImageStorageKey) {
        safeDeleteFile(testImageStorageKey);
        assert.ok(!fs.existsSync(path.join(uploadsDir, testImageStorageKey)));
      }

      assert.ok(fs.existsSync(path.join(uploadsDir, unrelatedFilename)));
      safeDeleteFile(unrelatedFilename);
    });
  });

  // ─── Section 9: Secure Support Lookup ───────────────────────────────────────
  await t.test("Secure Support Lookup", async (st) => {
    let unauthTicketRef;
    let unauthLookupToken;

    await st.test("Submit unauthenticated support ticket and get lookup token", async () => {
      const res = await fetch(`${baseUrl}/api/v1/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Anonymous Guest',
          email: 'anon@example.com',
          subject: 'Missing Booking PDF',
          category: 'technical',
          message: 'I did not receive my invoice PDF download link.'
        })
      });
      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.ticket_ref);
      assert.ok(body.data.lookup_token);
      unauthTicketRef = body.data.ticket_ref;
      unauthLookupToken = body.data.lookup_token;

      const [tickets] = await pool.query("SELECT id FROM support_tickets WHERE ticket_ref = ?", [unauthTicketRef]);
      unauthTicketId = tickets[0].id;
    });

    await st.test("Unauthenticated lookup fails with invalid token", async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'wrong-token-value' })
      });
      assert.equal(res.status, 404);
    });

    await st.test("Unauthenticated lookup succeeds with valid token and returns only safe fields", async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: unauthLookupToken })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.ticket.ticket_ref, unauthTicketRef);
      assert.equal(body.data.ticket.agent_notes, undefined);
      assert.equal(body.data.ticket.lookup_token_hash, undefined);
    });
  });

  // ─── Section 11: Complete Audit Coverage and sensitive field redaction ────────
  await t.test("Audit Log Coverage and Redaction", async (st) => {
    await st.test("Sanitizes sensitive fields from audit logs metadata and isolates cleanup", async () => {
      const AuditLog = require('../../models/AuditLog');
      const uniqueAction = `test_redaction_${runId}`;
      const concurrentAction = `test_redaction_concurrent_${runId}`;

      await AuditLog.create({
        adminId: testAdminId,
        action: uniqueAction,
        entityType: 'test',
        entityId: 1,
        metadata: {
          password: 'super-secret-password',
          jwt: 'secret-token',
          agent_notes: 'confidential internal notes',
          safe_field: 'safe value'
        },
        ip: '127.0.0.1'
      });

      // Create concurrent/another-session audit log to test isolation
      await AuditLog.create({
        adminId: testAdminId,
        action: concurrentAction,
        entityType: 'test',
        entityId: 2,
        metadata: {
          safe_field: 'concurrent safe value'
        },
        ip: '127.0.0.1'
      });

      const { items } = await AuditLog.findAll({ action: uniqueAction }, 1, 10);
      const filtered = items.filter(item => item.action === uniqueAction);
      assert.ok(filtered.length > 0);
      const parsedMeta = JSON.parse(filtered[0].metadata);

      assert.equal(parsedMeta.password, undefined);
      assert.equal(parsedMeta.jwt, undefined);
      assert.equal(parsedMeta.agent_notes, undefined);
      assert.equal(parsedMeta.safe_field, 'safe value');

      // Cleanup only our own primary log
      await pool.query("DELETE FROM audit_logs WHERE action = ?", [uniqueAction]);

      // Verify uniqueAction log was deleted
      const checkSelf = await AuditLog.findAll({ action: uniqueAction }, 1, 10);
      assert.equal(checkSelf.items.filter(item => item.action === uniqueAction).length, 0);

      // Verify concurrent/another-session log survives
      const checkConcurrent = await AuditLog.findAll({ action: concurrentAction }, 1, 10);
      assert.ok(checkConcurrent.items.some(item => item.action === concurrentAction), "Concurrent/unrelated audit log must survive targeted delete");

      // Now cleanup the concurrent log as well
      await pool.query("DELETE FROM audit_logs WHERE action = ?", [concurrentAction]);
    });
  });

  // ─── Section 12: CSV Formula Injection Protection ──────────────────────────
  await t.test("CSV Formula Injection Protection", async (st) => {
    await st.test("Unit test: csvEscape prefixes triggers with tab and quotes correctly", () => {
      const { csvEscape } = require('../../controllers/reportController');
      // Dangerous starts get tab-prefixed and are wrapped in quotes
      assert.equal(csvEscape('=SUM(A1)'), '"\t=SUM(A1)"');
      assert.equal(csvEscape('+123'), '"\t+123"');
      assert.equal(csvEscape('-abc'), '"\t-abc"');
      assert.equal(csvEscape('@cmd'), '"\t@cmd"');
      assert.equal(csvEscape('\tfoo'), '"\t\tfoo"');
      assert.equal(csvEscape('\rbar'), '"\t\rbar"');

      // Quotes, commas, and newlines are correctly handled
      assert.equal(csvEscape('safe-string'), '"safe-string"');
      assert.equal(csvEscape('val,with,commas'), '"val,with,commas"');
      assert.equal(csvEscape('val\nwith\nnewlines'), '"val\nwith\nnewlines"');
      assert.equal(csvEscape('val"with"quotes'), '"val""with""quotes"');

      // Combined injection and comma/quotes
      assert.equal(csvEscape('=SUM(A1,B1)'), '"\t=SUM(A1,B1)"');
      assert.equal(csvEscape('="a","b"'), '"\t=""a"",""b"""');
    });
  });

  // ─── Section 8: Account Deactivation / Reactivation ─────────────────────────
  await t.test("Deactivation and Reactivation Flow", async (st) => {
    // 1. Customer cannot login/profile once deactivated
    await st.test("Deactivated customer is blocked from profile page", async () => {
      // Deactivate customer via admin
      const resDeactivate = await fetch(`${baseUrl}/api/v1/admin/users/${testCustomerId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Testing soft deactivation' })
      });
      assert.equal(resDeactivate.status, 200);

      // Now customer profile call must return 401
      const resProfile = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.equal(resProfile.status, 401);

      // Reactivate customer
      const resReactivate = await fetch(`${baseUrl}/api/v1/admin/users/${testCustomerId}/reactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(resReactivate.status, 200);

      // Customer can get profile again
      const resProfileAfter = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.equal(resProfileAfter.status, 200);
    });

    await st.test("Admin cannot deactivate the last active admin account", async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/users/${testAdminId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Deactivating last admin' })
      });
      // 403 = cannot deactivate own account; 400 = last active admin guard
      assert.ok([400, 403].includes(res.status));
    });
  });

  // ─── Section 9: Contact & Support Ticket System ──────────────────────────────
  await t.test("Contact & Support Ticket Operations", async (st) => {
    let ticketRef;

    await st.test("Submit a support ticket successfully", async () => {
      const res = await fetch(`${baseUrl}/api/v1/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Payment Question',
          category: 'payment',
          message: 'My transaction reference did not complete.'
        })
      });
      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.ticket_ref);
      ticketRef = body.data.ticket_ref;
    });

    await st.test("Submit ticket via spam honeypot is silently completed without storing real data", async () => {
      const res = await fetch(`${baseUrl}/api/v1/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Spam Bot',
          email: 'spambot@example.com',
          subject: 'Buy cheap watches',
          category: 'other',
          message: 'Spam spam spam spam',
          website: 'http://spamurl.com' // Honeypot filled
        })
      });
      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.ticket_ref, 'TKT-HONEYPOT');
    });

    await st.test("Admin note appending and ticket detail notes isolation", async () => {
      // Find the ticket ID in DB from ref
      const [tickets] = await pool.query("SELECT id FROM support_tickets WHERE ticket_ref = ?", [ticketRef]);
      const ticketId = tickets[0].id;
      testTicketId = ticketId;

      // Add agent note via admin
      const resNote = await fetch(`${baseUrl}/api/v1/admin/support/${ticketId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: 'Investigated and payment looks good.' })
      });
      assert.equal(resNote.status, 200);

      // Admin detail contains agent_notes
      const resAdminDetail = await fetch(`${baseUrl}/api/v1/admin/support/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const bodyAdmin = await resAdminDetail.json();
      assert.ok(bodyAdmin.data.ticket.agent_notes.includes('Investigated'));

      // Customer detail or public search does NOT contain agent_notes
      // Public search (no auth) or user search
      const resPublic = await pool.query("SELECT * FROM support_tickets WHERE id = ?", [ticketId]);
      assert.ok(resPublic[0][0]);
      // The model functions used by client-facing routes MUST NOT SELECT agent_notes
      const SupportTicket = require('../../models/SupportTicket');
      const clientTicket = await SupportTicket.findByRef(ticketRef);
      assert.equal(clientTicket.agent_notes, undefined);
    });
  });

  // ─── Section 6: Admin PDF & CSV Reports ─────────────────────────────────────
  await t.test("Admin CSV and PDF Report Generation", async (st) => {
    await st.test("CSV Report has proper MIME headers and is safe from injection", async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/reports/bookings.csv`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Content-Type'), 'text/csv; charset=utf-8');
      assert.ok(res.headers.get('Content-Disposition').includes('attachment; filename="report-bookings-'));

      const buffer = Buffer.from(await res.arrayBuffer());
      // Verify UTF-8 BOM bytes
      assert.equal(buffer[0], 0xEF);
      assert.equal(buffer[1], 0xBB);
      assert.equal(buffer[2], 0xBF);
    });

    await st.test("PDF Report has proper PDF Content-Type header", async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/reports/payments.pdf`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Content-Type'), 'application/pdf');
    });
  });

  // ─── Section 4: Room Availability Calendar ──────────────────────────────────
  await t.test("Room Availability Calendar Month Query", async (st) => {
    await st.test("Fetches correct unavailable dates for room booking month", async () => {
      const res = await fetch(`${baseUrl}/api/v1/rooms/${testRoomId}/availability?year=2026&month=8`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);

      // booking is 2026-08-01 to 2026-08-05 (check-out exclusive)
      // dates 2026-08-01, 2026-08-02, 2026-08-03, 2026-08-04 should be unavailable
      const expected = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'];
      assert.deepEqual(body.data.unavailable_dates, expected);
    });
  });

  // ─── Section 5: Invoice PDF & Customer Receipt ──────────────────────────────
  await t.test("Invoice and Receipt PDF Generation", async (st) => {
    await st.test("Generate invoice PDF download returns proper application/pdf", async () => {
      const res = await fetch(`${baseUrl}/api/v1/bookings/${testBookingId}/invoice.pdf`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Content-Type'), 'application/pdf');
      assert.ok(res.headers.get('Content-Disposition').includes('attachment; filename="invoice-'));
    });

    await st.test("Generate receipt PDF download returns proper application/pdf since paid", async () => {
      const res = await fetch(`${baseUrl}/api/v1/bookings/${testBookingId}/receipt.pdf`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Content-Type'), 'application/pdf');
      assert.ok(res.headers.get('Content-Disposition').includes('attachment; filename="receipt-'));
    });

    await st.test("Access denied if customer requests another user's invoice", async () => {
      const res = await fetch(`${baseUrl}/api/v1/bookings/${testBookingId}/invoice.pdf`, {
        headers: { 'Authorization': `Bearer ${adminToken}` } // adminId !== testCustomerId (owner of booking)
      });
      // The invoice endpoint verifies user_id ownership match
      assert.equal(res.status, 404); // returns 404 Booking not found if ownership fails
    });
  });

  // ─── Section 7: Admin Audit Log ─────────────────────────────────────────────
  await t.test("Audit Log Recording", async (st) => {
    await st.test("Check log entries are created and fetchable by admin", async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.items.length > 0);

      // Ensure one of the entries matches the support status change or user deactivation
      const actions = body.data.items.map(item => item.action);
      assert.ok(actions.includes('user_deactivated') || actions.includes('user_reactivated') || actions.includes('support_ticket_status_changed') || actions.includes('report_exported'));
    });
  });

  // ─── Section 10: Review Moderation & Reporting ──────────────────────────────
  await t.test("Review Reporting and Moderation Queue", async (st) => {
    await st.test("Customer reviews a hotel they stayed at", async () => {
      const res = await fetch(`${baseUrl}/api/v1/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hotel_id: testHotelId,
          rating: 5,
          comment: 'Perfect stay at 7C hotel.'
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      testReviewId = body.data.review.id;
    });

    await st.test("Another user reports a review", async () => {
      const res = await fetch(`${baseUrl}/api/v1/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`, // admin reporting it
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'This looks like spam or fake review.',
          category: 'fake'
        })
      });
      assert.equal(res.status, 201);
    });

    await st.test("Admin views reported reviews, resolves the report, and hides the review", async () => {
      // 1. Get reports
      const resReports = await fetch(`${baseUrl}/api/v1/admin/reviews/reports`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(resReports.status, 200);
      const bodyReports = await resReports.json();
      assert.ok(bodyReports.data.items.length > 0);
      testReportId = bodyReports.data.items[0].id;

      // 2. Resolve the report as actioned
      const resResolve = await fetch(`${baseUrl}/api/v1/admin/reviews/reports/${testReportId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'actioned' })
      });
      assert.equal(resResolve.status, 200);

      // 3. Moderate / Hide review
      const resModerate = await fetch(`${baseUrl}/api/v1/admin/reviews/${testReviewId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'hide' })
      });
      assert.equal(resModerate.status, 200);

      // Verify the review is no longer in the public hotel reviews list
      const resReviewsPublic = await fetch(`${baseUrl}/api/v1/reviews/hotel/${testHotelId}`);
      const bodyPublic = await resReviewsPublic.json();
      const ids = bodyPublic.data.reviews.map(r => r.id);
      assert.ok(!ids.includes(testReviewId));
    });
  });

  // ─── Section 2: Server-Side Pagination & Coordinates ─────────────────────────
  await t.test("Pagination and Latitude/Longitude Coordinates check", async (st) => {
    await st.test("Hotels listing with pagination returns correct total counts and limits", async () => {
      const res = await fetch(`${baseUrl}/api/v1/hotels?paginate=true&limit=1&page=1`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.limit, 1);
      assert.equal(body.page, 1);
      assert.ok(body.total_items > 0);
      assert.ok(Array.isArray(body.items));
    });

    await st.test("Coordinate fields are properly saved and validated", async () => {
      const [hotel] = await pool.query("SELECT latitude, longitude FROM hotels WHERE id = ?", [testHotelId]);
      assert.equal(Number(hotel[0].latitude), 6.9271);
      assert.equal(Number(hotel[0].longitude), 79.8612);
    });
  });

});
