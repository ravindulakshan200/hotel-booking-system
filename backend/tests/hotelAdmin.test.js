const test = require("node:test");
const assert = require("node:assert/strict");
const { validateHotelInput } = require("../controllers/hotelController");
const Hotel = require("../models/Hotel");

// Extract the validation logic we want to test
test("validateHotelInput correctness", async (t) => {
  await t.test("Complete valid create payload", () => {
    const payload = {
      name: "Grand Hotel",
      address: "123 Main St",
      city: "Colombo",
      description: "A nice place",
      image_url: "https://example.com/image.jpg",
      star_rating: 5,
      amenities: ["Free Wi-Fi", "Swimming Pool"],
      contact_phone: "+94771234567",
      contact_email: "info@grand.com",
      map_url: "https://maps.app.goo.gl/xyz",
      status: "active"
    };
    const { valid, errors } = validateHotelInput(payload, true);
    assert.equal(valid, true, "Should be valid");
    assert.deepEqual(errors, []);
  });

  await t.test("Minimal valid/compatible payload", () => {
    const payload = {
      name: "Grand Hotel",
      address: "123 Main St",
      city: "Colombo",
      description: "A valid minimal description",
      image_url: "https://example.com/image.jpg"
    };
    const { valid, errors } = validateHotelInput(payload, true);
    assert.equal(valid, true, "Should be valid with only required fields");
    assert.deepEqual(errors, []);
  });

  await t.test("Missing required fields", () => {
    const payload = {
      name: "Grand Hotel"
    };
    const { valid, errors } = validateHotelInput(payload, true);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("address is required")));
    assert.ok(errors.some(e => e.includes("city is required")));
    assert.ok(errors.some(e => e.includes("description is required")));
  });

  await t.test("HTTP image URL rejection", () => {
    const payload = {
      name: "Grand Hotel", address: "123 Main St", city: "Colombo",
      image_url: "http://example.com/image.jpg"
    };
    const { valid, errors } = validateHotelInput(payload, true);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("valid HTTPS URL")));
  });

  await t.test("Invalid star rating", () => {
    const payload = { star_rating: 6 };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("must be an integer between 1 and 5")));
  });

  await t.test("Invalid email", () => {
    const payload = { contact_email: "not-an-email" };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("must be a valid email address")));
  });

  await t.test("Invalid phone", () => {
    const payload = { contact_phone: "123456789012345678901" };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("contact_phone must not exceed 20 characters")));
  });

  await t.test("Invalid map URL", () => {
    const payload = { map_url: "https://example.com/maps" };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("HTTPS Google Maps URL")));
  });

  await t.test("Invalid status", () => {
    const payload = { status: "pending" };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("status must be active or inactive")));
  });

  await t.test("Invalid amenity", () => {
    const payload = { amenities: ["Fake Amenity"] };
    const { valid, errors } = validateHotelInput(payload, false);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("amenities must be an array of valid strings")));
  });
});

test("Hotel query logic isolation", async (t) => {
  const pool = require("../config/db");
  const originalQuery = pool.query;

  test.after(() => {
    pool.query = originalQuery;
  });

  await t.test("Parameterized create/update query - update drops undefined", async () => {
    let capturedSql;
    let capturedParams;
    pool.query = async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return [{ affectedRows: 1 }];
    };

    const updates = { name: "New Name", description: "New Desc" };
    const affected = await Hotel.update(10, updates);

    assert.equal(affected, 1);
    assert.ok(capturedSql.includes("name = ?"));
    assert.ok(capturedSql.includes("description = ?"));
    assert.ok(!capturedSql.includes("image_url = ?"));
    assert.deepEqual(capturedParams, ["New Name", "New Desc", 10]);
  });

  await t.test("Inactive hotel excluded publicly", async () => {
    let capturedSql;
    pool.query = async (sql, params) => {
      capturedSql = sql;
      return [[]];
    };
    await Hotel.findAll({ city: "Colombo" });
    assert.ok(capturedSql.includes("status = 'active'"));
  });

  await t.test("Admin listing includes inactive hotels", async () => {
    let capturedSql;
    pool.query = async (sql, params) => {
      capturedSql = sql;
      return [[]];
    };
    await Hotel.findAll({ includeInactive: true });
    assert.ok(!capturedSql.includes("status = 'active'"));
  });

  await t.test("Existing rows with null optional values", async () => {
    let capturedSql;
    let capturedParams;
    pool.query = async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return [{ affectedRows: 1 }];
    };
    const updates = { name: "New Name", image_url: null };
    const affected = await Hotel.update(10, updates);
    assert.ok(capturedSql.includes("image_url = ?"));
    assert.deepEqual(capturedParams, ["New Name", null, 10]);
  });
});
