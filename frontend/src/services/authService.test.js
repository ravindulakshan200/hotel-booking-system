import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logout, getProfile } from './authService';
import api, { setCsrfToken } from '../api/axios';

describe('authService logout', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = vi.fn();
    api.defaults.adapter = mockAdapter;
    setCsrfToken(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logout should clear the CSRF token in memory and next unsafe request should use a fresh token', async () => {
    setCsrfToken('stale-token');

    mockAdapter.mockResolvedValueOnce({
      status: 200,
      data: { success: true },
      config: { url: '/auth/logout', method: 'post' }
    });

    await logout();

    expect(mockAdapter.mock.calls[0][0].url).toBe('/auth/logout');
    expect(mockAdapter.mock.calls[0][0].headers['x-csrf-token']).toBe('stale-token');

    // Next request simulates the 403 failure, auto-refresh, and retry
    mockAdapter
      .mockRejectedValueOnce({
        config: { url: '/test-unsafe', method: 'post', headers: {}, _retry: false },
        response: { status: 403, data: { code: 'ERR_CSRF_INVALID' } }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { csrfToken: 'fresh-new-token' } },
        config: { url: '/auth/csrf-token', method: 'get' }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        config: { url: '/test-unsafe', method: 'post' }
      });

    const response = await api.post('/test-unsafe', {});

    expect(response.data.success).toBe(true);

    const retryConfig = mockAdapter.mock.calls[3][0];
    expect(retryConfig.url).toBe('/test-unsafe');
    expect(retryConfig.headers['x-csrf-token']).toBe('fresh-new-token');
  });

  it('logout failure behavior does not leave authentication/token state in an unsafe ambiguous state', async () => {
    setCsrfToken('stale-token');

    mockAdapter.mockRejectedValueOnce({
      config: { url: '/auth/logout', method: 'post', headers: { 'x-csrf-token': 'stale-token' } },
      response: { status: 500, data: { message: 'Server error' } }
    });

    // The logout should fail, but the token should still be cleared
    await expect(logout()).rejects.toBeTruthy();

    // Verify token was cleared by simulating an unsafe request which will have no token
    mockAdapter.mockResolvedValueOnce({
      status: 200,
      data: { success: true },
      config: { url: '/test-unsafe', method: 'post' }
    });

    await api.post('/test-unsafe', {});

    const nextReqConfig = mockAdapter.mock.calls[1][0];
    expect(nextReqConfig.url).toBe('/test-unsafe');
    expect(nextReqConfig.headers['x-csrf-token']).toBeUndefined();
  });
});

describe('authService getProfile', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = vi.fn();
    api.defaults.adapter = mockAdapter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getProfile sends skipAuthRedirect: true to prevent redirecting anonymous users', async () => {
    mockAdapter.mockResolvedValueOnce({
      status: 200,
      data: { success: true, data: { user: { email: 'test@example.com' } } },
      config: { url: '/auth/profile', method: 'get', skipAuthRedirect: true }
    });

    await getProfile();

    expect(mockAdapter.mock.calls[0][0].url).toBe('/auth/profile');
    expect(mockAdapter.mock.calls[0][0].skipAuthRedirect).toBe(true);
  });
});
