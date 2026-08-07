import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api, { setCsrfToken } from './axios';

describe('Axios Interceptor CSRF Refresh', () => {
  let mockAdapter;
  let originalWindowLocation;

  beforeEach(() => {
    // Reset CSRF token
    setCsrfToken(null);

    // Mock window.location
    originalWindowLocation = window.location;
    delete window.location;
    window.location = {
      pathname: '/',
      href: ''
    };

    // Use a custom adapter to intercept requests
    mockAdapter = vi.fn();
    api.defaults.adapter = mockAdapter;
  });

  afterEach(() => {
    window.location = originalWindowLocation;
    vi.restoreAllMocks();
  });

  it('should not add x-csrf-token to safe methods', async () => {
    setCsrfToken('test-token');
    mockAdapter.mockResolvedValue({ status: 200, data: {} });

    await api.get('/test');

    const config = mockAdapter.mock.calls[0][0];
    expect(config.headers['x-csrf-token']).toBeUndefined();
  });

  it('should add x-csrf-token to unsafe methods if token exists', async () => {
    setCsrfToken('test-token');
    mockAdapter.mockResolvedValue({ status: 200, data: {} });

    await api.post('/test', {});

    const config = mockAdapter.mock.calls[0][0];
    expect(config.headers['x-csrf-token']).toBe('test-token');
  });

  it('should transparently refresh CSRF token and retry once on 403 ERR_CSRF_INVALID', async () => {
    setCsrfToken('old-token');

    // First request: main request fails with 403
    // Second request: csrf refresh succeeds
    // Third request: main request retries and succeeds
    mockAdapter
      .mockRejectedValueOnce({
        config: { url: '/test', method: 'post', headers: {} },
        response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { csrfToken: 'fresh-token' } },
        config: { url: '/auth/csrf-token' }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        config: { url: '/test', method: 'post' }
      });

    const response = await api.post('/test', {});

    expect(response.data.success).toBe(true);
    expect(mockAdapter).toHaveBeenCalledTimes(3);

    // The retry request should have the fresh token
    const retryConfig = mockAdapter.mock.calls[2][0];
    expect(retryConfig.headers['x-csrf-token']).toBe('fresh-token');
  });

  it('should fail with original error if refresh fails', async () => {
    mockAdapter
      .mockRejectedValueOnce({
        config: { url: '/test', method: 'post', headers: {} },
        response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
      })
      .mockRejectedValueOnce({
        // Refresh also fails
        config: { url: '/auth/csrf-token' },
        response: { status: 500 }
      });

    const err = await api.post('/test', {}).catch(e => e);
    expect(err.response.status).toBe(403);
    expect(err.response.data.code).toBe('ERR_CSRF_INVALID');
    expect(err.response.data.message).toBe('Your session expired. Please try again.');

    expect(mockAdapter).toHaveBeenCalledTimes(2);
  });

  it('should not retry infinitely on 403 ERR_CSRF_INVALID', async () => {
    // If the retry also fails with 403 ERR_CSRF_INVALID, it should not trigger another refresh
    mockAdapter
      .mockRejectedValueOnce({
        config: { url: '/test', method: 'post', headers: {} },
        response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { csrfToken: 'fresh-token' } },
        config: { url: '/auth/csrf-token' }
      })
      .mockRejectedValueOnce({
        // Retry request fails again
        config: { url: '/test', method: 'post', headers: { 'x-csrf-token': 'fresh-token' }, _retry: true },
        response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
      });

    const err = await api.post('/test', {}).catch(e => e);
    expect(err.response.status).toBe(403);
    expect(err.response.data.code).toBe('ERR_CSRF_INVALID');
    expect(err.response.data.message).toBe('Your session expired. Please try again.');

    expect(mockAdapter).toHaveBeenCalledTimes(3);
  });

  it('should combine multiple concurrent failed requests into a single refresh (single-flight)', async () => {
    // First two requests fail with 403 concurrently
    let resolveRefresh;
    const refreshPromise = new Promise(resolve => {
      resolveRefresh = resolve;
    });

    mockAdapter.mockImplementation((config) => {
      if (config.url === '/test1' || config.url === '/test2') {
        if (!config._retry) {
          return Promise.reject({
            config,
            response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
          });
        } else {
          return Promise.resolve({ status: 200, data: { url: config.url, token: config.headers['x-csrf-token'] } });
        }
      }

      if (config.url.includes('/auth/csrf-token')) {
        return refreshPromise;
      }
    });

    // Start two concurrent unsafe requests
    const req1 = api.post('/test1', {});
    const req2 = api.post('/test2', {});

    // Now resolve the single flight refresh
    resolveRefresh({
      status: 200,
      data: { data: { csrfToken: 'fresh-token-concurrent' } },
      config: { url: '/auth/csrf-token' }
    });

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.data.token).toBe('fresh-token-concurrent');
    expect(res2.data.token).toBe('fresh-token-concurrent');

    // Adapter should be called 2 (initial) + 1 (refresh) + 2 (retries) = 5 times
    expect(mockAdapter).toHaveBeenCalledTimes(5);

    const refreshCalls = mockAdapter.mock.calls.filter(call => call[0].url.includes('/auth/csrf-token'));
    expect(refreshCalls.length).toBe(1); // Single-flight success
  });

  it('should redirect to /login on 401 response if not already on /login', async () => {
    mockAdapter.mockRejectedValueOnce({
      config: { url: '/test', method: 'get' },
      response: { status: 401 }
    });

    await expect(api.get('/test')).rejects.toBeTruthy();
    expect(window.location.href).toBe('/login');
  });

  it('should not redirect to /login on 401 if already on /login', async () => {
    window.location.pathname = '/login';
    mockAdapter.mockRejectedValueOnce({
      config: { url: '/test', method: 'get' },
      response: { status: 401 }
    });

    await expect(api.get('/test')).rejects.toBeTruthy();
    expect(window.location.href).toBe('');
  });
});
