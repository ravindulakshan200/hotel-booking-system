const test = require("node:test");
const assert = require("node:assert/strict");
const emailService = require("../../../backend/services/emailService");

test("Email Templates Generator", async (t) => {
  await t.test("should generate payment_received template with correct html escaping", () => {
    const event = {
      event_type: "payment_received",
      recipient_email: "test@example.com",
      payload: {
        bookingId: 101,
        hotelName: "<script>alert('xss')</script>",
        checkIn: "2026-08-01",
        checkOut: "2026-08-05",
        totalPrice: "50000"
      }
    };

    const { htmlContent, textContent, subject } = emailService._buildEmailTemplate(event);

    assert.ok(subject.includes("101"));
    assert.ok(htmlContent.includes("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"));
    assert.ok(!htmlContent.includes("<script>"));
    assert.ok(htmlContent.includes("101"));
    assert.ok(textContent.includes("101"));
  });

  await t.test("should generate refund_processing template correctly", () => {
    const event = { event_type: "refund_processing", payload: { bookingId: 102 } };
    const { htmlContent, textContent, subject } = emailService._buildEmailTemplate(event);

    assert.ok(subject.includes("102"));
    assert.ok(htmlContent.includes("102"));
    assert.ok(htmlContent.includes("currently being processed"));
  });

  await t.test("should generate refund_rejected template correctly", () => {
    const event = { event_type: "refund_rejected", payload: { bookingId: 103 } };
    const { htmlContent, textContent, subject } = emailService._buildEmailTemplate(event);

    assert.ok(subject.includes("103"));
    assert.ok(htmlContent.includes("103"));
    assert.ok(htmlContent.includes("could not be approved"));
  });

  await t.test("should generate checkin_reminder template correctly", () => {
    const event = {
      event_type: "checkin_reminder",
      payload: { bookingId: 104, hotelName: "Grand Hotel", checkIn: "2026-08-01" }
    };
    const { htmlContent, textContent, subject } = emailService._buildEmailTemplate(event);

    assert.ok(subject.includes("Tomorrow"));
    assert.ok(htmlContent.includes("104"));
    assert.ok(htmlContent.includes("Grand Hotel"));
    assert.ok(htmlContent.includes("2026-08-01"));
  });
});
