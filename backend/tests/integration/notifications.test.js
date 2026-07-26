const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../app")();
const pool = require("../../config/db");
const generateToken = require("../../utils/generateToken");

test("Notifications Integration", async (t) => {
  let userToken;
  let userId;
  let notificationId;

  t.before(async () => {
    // Insert a test user
    const [result] = await pool.query(
      "INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)",
      ["Test", "User", "notifuser@example.com", "hashedpassword"]
    );
    userId = result.insertId;
    userToken = generateToken(userId, "user");

    // Insert some notifications
    const [insertResult] = await pool.query(
      `INSERT INTO notifications (user_id, event_key, type, title, message)
       VALUES (?, ?, 'system', 'Test 1', 'Message 1')`,
      [userId, `sys_1_${Date.now()}`]
    );
    notificationId = insertResult.insertId;

    await pool.query(
      `INSERT INTO notifications (user_id, event_key, type, title, message)
       VALUES (?, ?, 'booking', 'Test 2', 'Message 2')`,
      [userId, `bk_1_${Date.now()}`]
    );
  });

  t.after(async () => {
    await pool.query("DELETE FROM users WHERE email = 'notifuser@example.com'");
  });

  await t.test("should get paginated notifications for the user", async () => {
    const res = await request(app)
      .get("/api/v1/notifications?page=1&page_size=1")
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.notifications.length, 1);
    assert.equal(res.body.data.total, 2);
  });

  await t.test("should return the correct unread count", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.count, 2);
  });

  await t.test("should mark a single notification as read", async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(res.status, 200);

    const countRes = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(countRes.body.data.count, 1);
  });

  await t.test("should mark all remaining notifications as read", async () => {
    const res = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.count, 1); // 1 was marked

    const countRes = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Cookie", `jwt=${userToken}`);

    assert.equal(countRes.body.data.count, 0);
  });
});
