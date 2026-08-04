/**
 * tests/integration/hotelPagination.test.js
 *
 * HTTP-level regression tests for the GET /api/v1/hotels pagination bug.
 *
 * Root cause (confirmed):
 *   Hotel.findAll only applied LIMIT/OFFSET when queryParams.paginate was
 *   truthy. A request like GET /api/v1/hotels?page=1&limit=5 (without
 *   paginate=true) hit the "return all" branch and returned every row in the
 *   database regardless of what page or limit said.
 *
 * Fix:
 *   Hotel.findAll now detects the presence of page or limit in queryParams and
 *   applies SQL LIMIT / OFFSET even when the paginate flag is absent, returning
 *   a {rows, total, page, limit} object that the controller shapes into the
 *   existing {data.count, data.hotels, data.page, data.limit} envelope.
 *
 * Test strategy:
 *   - Start a real Express server on an ephemeral port using createApp().
 *   - Stub pool.query before each test so the DB layer is exercised through the
 *     model, but no real database connection is required.
 *   - Issue real HTTP requests and assert on the full JSON response body.
 *   - This validates the entire controller + model + response-shaping path.
 *
 * No production or TiDB credentials are used.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');

// ── env setup (must precede config/db require) ───────────────────────────────
process.env.JWT_SECRET   = process.env.JWT_SECRET   || 'test-only-secret-with-more-than-32-characters';
process.env.CLIENT_URL   = process.env.CLIENT_URL   || 'http://localhost:5173';
process.env.NODE_ENV     = 'test';

const pool       = require('../../config/db');
const createApp  = require('../../app');

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build N fake hotel rows. Amenities stored as JSON string (like real DB). */
function makeRows(n, startId = 1) {
  return Array.from({ length: n }, (_, i) => ({
    id:          startId + i,
    name:        `Hotel ${startId + i}`,
    city:        'Colombo',
    address:     `${startId + i} Main St`,
    description: 'A fine hotel',
    image_url:   'https://example.com/img.jpg',
    star_rating: 4,
    amenities:   '["Free Wi-Fi"]',
    contact_phone: null,
    contact_email: null,
    map_url:       null,
    status:        'active',
    is_archived:   0,
    latitude:      null,
    longitude:     null,
    created_at:  new Date('2024-01-01T00:00:00Z').toISOString(),
    updated_at:  new Date('2024-01-01T00:00:00Z').toISOString(),
  }));
}

/** All 7 fake hotels, ordered by created_at DESC, id DESC (newest first). */
const ALL_HOTELS = makeRows(7, 7).reverse(); // ids 13..7 → simulate DESC order

/**
 * Install a pool.query stub for the duration of a test.
 * The stub simulates the hotels table holding ALL_HOTELS rows.
 * Returns a restore callback — always call it in a finally block.
 *
 * @param {number} realTotal  The COUNT(*) the stub will report.
 * @param {Function} [rowsFn] Optional override: (limit, offset) => rows[].
 *                            Defaults to slicing ALL_HOTELS.
 */
function stubPool(realTotal, rowsFn) {
  const original = pool.query.bind(pool);
  const queries  = [];

  pool.query = async (sql, params) => {
    queries.push({ sql, params: params || [] });

    if (sql.includes('COUNT(*)') || sql.includes('COUNT(DISTINCT')) {
      return [[{ total: realTotal }]];
    }

    if (rowsFn) {
      return [rowsFn(sql, params)];
    }

    // Default: honour LIMIT / OFFSET if present in params
    const p = params || [];
    let rows = ALL_HOTELS.slice();
    if (sql.includes('LIMIT')) {
      const offset = p[p.length - 1];
      const limit  = p[p.length - 2];
      rows = ALL_HOTELS.slice(offset, offset + limit);
    }
    return [rows];
  };

  return {
    restore: () => { pool.query = original; },
    queries,
  };
}

// ── server lifecycle ──────────────────────────────────────────────────────────

let server;
let baseUrl;

test.before(async () => {
  server  = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

// ── tests ─────────────────────────────────────────────────────────────────────

test('GET /api/v1/hotels — pagination integration', async (t) => {

  // ── 1. page=1&limit=5 ───────────────────────────────────────────────────────
  await t.test('page=1&limit=5 returns exactly 5 hotels with total count=7', async () => {
    const stub = stubPool(7);
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=5`);
      const body = await res.json();

      assert.equal(res.status, 200,          'HTTP status must be 200');
      assert.equal(body.success, true,        'success must be true');
      assert.ok(Array.isArray(body.data.hotels), 'data.hotels must be an array');
      assert.equal(body.data.hotels.length, 5, 'must return exactly 5 hotels');
      assert.equal(body.data.count, 7,         'data.count must be total 7');
      assert.equal(body.data.page,  1,         'data.page must be 1');
      assert.equal(body.data.limit, 5,         'data.limit must be 5');

      // Verify SQL correctness: COUNT query + data query both issued
      const countQ = stub.queries.find(q => q.sql.includes('COUNT(*)'));
      const dataQ  = stub.queries.find(q => q.sql.includes('LIMIT'));
      assert.ok(countQ,                         'COUNT query must be issued');
      assert.ok(dataQ,                          'LIMIT query must be issued');

      // LIMIT and OFFSET must be parameterised, not concatenated
      const dp = dataQ.params;
      assert.equal(dp[dp.length - 2], 5, 'LIMIT param must be 5');
      assert.equal(dp[dp.length - 1], 0, 'OFFSET param must be 0 for page 1');
    } finally {
      stub.restore();
    }
  });

  // ── 2. page=2&limit=5 ───────────────────────────────────────────────────────
  await t.test('page=2&limit=5 returns 2 remaining hotels, no overlap with page 1', async () => {
    const stub = stubPool(7);
    try {
      const res1  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=5`);
      const body1 = await res1.json();
      const res2  = await fetch(`${baseUrl}/api/v1/hotels?page=2&limit=5`);
      const body2 = await res2.json();

      assert.equal(res2.status, 200);
      assert.equal(body2.data.hotels.length, 2, 'page 2 must contain 2 remaining hotels');
      assert.equal(body2.data.count, 7,         'total count must still be 7');
      assert.equal(body2.data.page, 2);
      assert.equal(body2.data.limit, 5);

      // No overlap: IDs from page 1 must not appear on page 2
      const ids1 = body1.data.hotels.map(h => h.id);
      const ids2 = body2.data.hotels.map(h => h.id);
      const overlap = ids1.filter(id => ids2.includes(id));
      assert.equal(overlap.length, 0, `page 1 and page 2 must not share records (overlap: ${overlap})`);

      // OFFSET for page 2 must be 5
      const dataQueries = stub.queries.filter(q => q.sql.includes('LIMIT'));
      // Last LIMIT query (for page 2)
      const lastDataQ = dataQueries[dataQueries.length - 1];
      const dp = lastDataQ.params;
      assert.equal(dp[dp.length - 1], 5, 'OFFSET must be 5 for page 2');
    } finally {
      stub.restore();
    }
  });

  // ── 3. No pagination params — all hotels returned (backward compat) ──────────
  await t.test('no page/limit params returns all hotels in data.count + data.hotels', async () => {
    const stub = stubPool(7, (sql, params) => ALL_HOTELS);
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.hotels));
      assert.equal(body.data.count, body.data.hotels.length,
        'data.count must equal hotels array length when no pagination');

      // No COUNT query should be issued for the no-pagination path
      const countQ = stub.queries.find(q => q.sql.includes('COUNT(*)'));
      assert.equal(countQ, undefined, 'COUNT query must NOT be issued without page/limit');

      // No LIMIT in the SQL
      const limitQ = stub.queries.find(q => q.sql.includes('LIMIT'));
      assert.equal(limitQ, undefined, 'LIMIT must NOT appear in SQL without page/limit params');
    } finally {
      stub.restore();
    }
  });

  // ── 4. paginate=true returns paginated envelope (existing behaviour) ─────────
  await t.test('paginate=true returns items/total_items/total_pages envelope', async () => {
    const stub = stubPool(7);
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels?paginate=true&page=1&limit=5`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      // The paginate=true path spreads the result directly onto the response
      assert.ok(Array.isArray(body.items),    'items must be an array');
      assert.equal(body.items.length, 5,       'items must have 5 entries');
      assert.equal(body.total_items, 7,        'total_items must be 7');
      assert.equal(body.total_pages, 2,        'total_pages must be 2');
      assert.equal(body.page, 1);
      assert.equal(body.limit, 5);
      assert.equal(body.has_next, true);
      assert.equal(body.has_previous, false);
    } finally {
      stub.restore();
    }
  });

  // ── 5. Invalid page values are clamped safely ────────────────────────────────
  await t.test('invalid page values (0, -1, abc) clamp to page=1', async () => {
    for (const badPage of ['0', '-1', 'abc']) {
      const stub = stubPool(7);
      try {
        const res  = await fetch(`${baseUrl}/api/v1/hotels?page=${badPage}&limit=5`);
        const body = await res.json();

        assert.equal(res.status, 200, `page=${badPage} should not cause error`);
        assert.equal(body.data.page, 1,
          `page=${badPage} must clamp to 1, got ${body.data.page}`);
        assert.equal(body.data.hotels.length, 5,
          `page=${badPage} should still return up to 5 hotels`);

        // SQL OFFSET must be 0 (page 1)
        const dataQ = stub.queries.find(q => q.sql.includes('LIMIT'));
        const dp = dataQ.params;
        assert.equal(dp[dp.length - 1], 0,
          `OFFSET must be 0 when page=${badPage} clamps to 1`);
      } finally {
        stub.restore();
      }
    }
  });

  // ── 6. Invalid limit values are clamped safely ───────────────────────────────
  await t.test('invalid limit values (0, -1, abc) clamp to DEFAULT_LIMIT', async () => {
    const { DEFAULT_LIMIT } = require('../../utils/paginate');

    for (const badLimit of ['0', '-1', 'abc']) {
      const stub = stubPool(7);
      try {
        const res  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=${badLimit}`);
        const body = await res.json();

        assert.equal(res.status, 200, `limit=${badLimit} should not cause error`);
        assert.equal(body.data.limit, DEFAULT_LIMIT,
          `limit=${badLimit} must clamp to DEFAULT_LIMIT (${DEFAULT_LIMIT}), got ${body.data.limit}`);

        // SQL LIMIT must be DEFAULT_LIMIT
        const dataQ = stub.queries.find(q => q.sql.includes('LIMIT'));
        const dp = dataQ.params;
        assert.equal(dp[dp.length - 2], DEFAULT_LIMIT,
          `SQL LIMIT param must be ${DEFAULT_LIMIT} when limit=${badLimit}`);
      } finally {
        stub.restore();
      }
    }
  });

  // ── 7. Excessively large limit is capped to MAX_LIMIT ───────────────────────
  await t.test('limit > MAX_LIMIT is capped to MAX_LIMIT', async () => {
    const { MAX_LIMIT } = require('../../utils/paginate');
    const stub = stubPool(7);
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=${MAX_LIMIT + 9999}`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.limit, MAX_LIMIT,
        `limit must be capped to ${MAX_LIMIT}`);

      const dataQ = stub.queries.find(q => q.sql.includes('LIMIT'));
      const dp = dataQ.params;
      assert.equal(dp[dp.length - 2], MAX_LIMIT,
        `SQL LIMIT param must be ${MAX_LIMIT}`);
    } finally {
      stub.restore();
    }
  });

  // ── 8. Filter (city) applied consistently to COUNT and data queries ──────────
  await t.test('city filter is applied to both COUNT query and data query', async () => {
    const stub = stubPool(3, (sql, params) => makeRows(3, 1));
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=10&city=Kandy`);
      const body = await res.json();

      assert.equal(res.status, 200);

      const countQ = stub.queries.find(q => q.sql.includes('COUNT(*)'));
      const dataQ  = stub.queries.find(q => q.sql.includes('LIMIT'));

      assert.ok(countQ, 'COUNT query must be issued');
      assert.ok(dataQ,  'Data query must be issued');

      // Both queries must contain the city condition
      assert.ok(countQ.sql.includes('LOWER(city) = LOWER(?)'),
        'COUNT query must include city filter');
      assert.ok(dataQ.sql.includes('LOWER(city) = LOWER(?)'),
        'Data query must include city filter');

      // Both must receive the city value as a parameter
      assert.ok(countQ.params.includes('Kandy'),
        'COUNT params must include city value');
      assert.ok(dataQ.params.includes('Kandy'),
        'Data params must include city value');
    } finally {
      stub.restore();
    }
  });

  // ── 9. Filter (search) + pagination — filter consistent in both queries ──────
  await t.test('search filter combined with page/limit is consistent in COUNT and data queries', async () => {
    const stub = stubPool(2, (sql, params) => makeRows(2, 1));
    try {
      const res  = await fetch(`${baseUrl}/api/v1/hotels?page=1&limit=10&search=grand`);
      const body = await res.json();

      assert.equal(res.status, 200);

      const countQ = stub.queries.find(q => q.sql.includes('COUNT(*)'));
      const dataQ  = stub.queries.find(q => q.sql.includes('LIMIT'));

      assert.ok(countQ.sql.includes('name LIKE ?'),   'COUNT must include search filter');
      assert.ok(dataQ.sql.includes('name LIKE ?'),    'Data query must include search filter');
      assert.ok(countQ.params.includes('%grand%'),     'COUNT params must include LIKE term');
      assert.ok(dataQ.params.includes('%grand%'),      'Data params must include LIKE term');
    } finally {
      stub.restore();
    }
  });

  // ── 10. Stable ORDER BY in all SQL paths ─────────────────────────────────────
  await t.test('ORDER BY created_at DESC, id DESC is present in all data queries', async () => {
    for (const url of [
      `${baseUrl}/api/v1/hotels?page=1&limit=5`,
      `${baseUrl}/api/v1/hotels`,
      `${baseUrl}/api/v1/hotels?paginate=true&page=1&limit=5`,
    ]) {
      const stub = stubPool(7);
      try {
        await fetch(url);
        const dataQs = stub.queries.filter(
          q => !q.sql.includes('COUNT(*)') && !q.sql.includes('COUNT(DISTINCT')
        );
        for (const q of dataQs) {
          assert.ok(
            q.sql.includes('ORDER BY created_at DESC, id DESC'),
            `Every data query must have deterministic ORDER BY.\nURL: ${url}\nSQL: ${q.sql.substring(0, 120)}`
          );
        }
      } finally {
        stub.restore();
      }
    }
  });

  // ── 11. LIMIT and OFFSET are parameterised (no SQL injection vector) ─────────
  await t.test('LIMIT and OFFSET values are passed as SQL parameters, not concatenated', async () => {
    const stub = stubPool(7);
    try {
      await fetch(`${baseUrl}/api/v1/hotels?page=2&limit=3`);
      const dataQ = stub.queries.find(q => q.sql.includes('LIMIT'));

      // The SQL string must use placeholder "?" not literal numbers for limit/offset
      assert.ok(
        dataQ.sql.match(/LIMIT \?/),
        'LIMIT must use parameterized "?" placeholder, not a literal number'
      );
      assert.ok(
        dataQ.sql.match(/OFFSET \?/),
        'OFFSET must use parameterized "?" placeholder, not a literal number'
      );

      // Actual values arrive only in params
      const dp = dataQ.params;
      assert.equal(dp[dp.length - 2], 3, 'LIMIT param must be 3');
      assert.equal(dp[dp.length - 1], 3, 'OFFSET param must be 3 for page 2 with limit 3');
    } finally {
      stub.restore();
    }
  });

  // ── 12. No page exceeds the requested limit ───────────────────────────────────
  await t.test('no page ever returns more hotels than the requested limit', async () => {
    for (let page = 1; page <= 2; page++) {
      const stub = stubPool(7);
      try {
        const res  = await fetch(`${baseUrl}/api/v1/hotels?page=${page}&limit=5`);
        const body = await res.json();
        assert.ok(
          body.data.hotels.length <= 5,
          `Page ${page}: got ${body.data.hotels.length} hotels, expected <= 5`
        );
      } finally {
        stub.restore();
      }
    }
  });
});
