import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, test, describe, vi } from "vitest";

vi.mock("./services/hotelService", () => ({
  getHotels: vi.fn().mockResolvedValue({ data: { data: { hotels: [] } } }),
  getHotelById: vi.fn().mockResolvedValue({ data: { data: { hotel: null } } }),
}));

import api from "./api/axios";
import App from "./App";
import AdminDashboard from "./pages/admin/AdminDashboard";

describe('App General Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  test("renders the home hero on the landing page", async () => {
    render(<App />);
    expect(await screen.findByText(/Your Perfect Stay/i)).toBeInTheDocument();
  });

  test("loads the admin dashboard module without crashing", () => {
    expect(AdminDashboard).toBeDefined();
  });
});

describe('App Routing Deep Links', () => {
  let mockAdapter;
  let originalWindowLocation;
  let currentHref;

  beforeEach(() => {
    localStorage.clear();

    originalWindowLocation = window.location;
    delete window.location;

    currentHref = 'http://localhost/';
    window.location = {
      ...originalWindowLocation,
      assign: vi.fn(),
      replace: vi.fn(),
      origin: 'http://localhost',
      pathname: '/',
    };

    Object.defineProperty(window.location, 'href', {
      get: () => currentHref,
      set: (val) => { currentHref = val; }
    });

    mockAdapter = vi.fn();
    api.defaults.adapter = mockAdapter;
  });

  afterEach(() => {
    window.location = originalWindowLocation;
    vi.restoreAllMocks();
  });

  test("public /reset-password/:token deep link renders without redirecting anonymous users to /login", async () => {
    window.location.pathname = "/reset-password/test-token";
    currentHref = "http://localhost/reset-password/test-token";
    window.history.replaceState({}, "", "/reset-password/test-token");

    mockAdapter.mockImplementation((config) => {
      if (config.url === '/auth/csrf-token') {
        return Promise.resolve({ status: 200, data: { data: { csrfToken: 'fake' } } });
      }
      if (config.url === '/auth/profile') {
        return Promise.reject({
          config,
          response: { status: 401 }
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: /Set New Password/i })).toBeInTheDocument();

    expect(window.location.pathname).toBe("/reset-password/test-token");
  });

  test("public /verify-email/:token deep link renders without redirecting anonymous users to /login", async () => {
    window.location.pathname = "/verify-email/test-token";
    currentHref = "http://localhost/verify-email/test-token";
    window.history.replaceState({}, "", "/verify-email/test-token");

    mockAdapter.mockImplementation((config) => {
      if (config.url === '/auth/csrf-token') {
        return Promise.resolve({ status: 200, data: { data: { csrfToken: 'fake' } } });
      }
      if (config.url === '/auth/profile') {
        return Promise.reject({
          config,
          response: { status: 401 }
        });
      }
      if (config.url.startsWith('/auth/verify-email/')) {
        return Promise.resolve({ status: 200, data: { message: 'Your email has been verified!' } });
      }
      return Promise.resolve({ status: 200, data: {} });
    });

    render(<App />);

    expect(await screen.findByText(/Email Verified!/i)).toBeInTheDocument();

    expect(window.location.pathname).toBe("/verify-email/test-token");
  });

  test("ordinary protected-request 401 still redirects to /login", async () => {
    window.location.pathname = "/profile";
    currentHref = "http://localhost/profile";
    window.history.replaceState({}, "", "/profile");

    mockAdapter.mockImplementation((config) => {
      if (config.url === '/auth/csrf-token') {
        return Promise.resolve({ status: 200, data: { data: { csrfToken: 'fake' } } });
      }
      if (config.url === '/auth/profile') {
        return Promise.resolve({
          status: 200,
          data: { success: true, data: { user: { email: 'test@example.com' } } }
        });
      }
      if (config.url === '/api/v1/some-protected-data') {
        return Promise.reject({
          config,
          response: { status: 401 }
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });

    render(<App />);

    await waitFor(() => {
      // If the Profile link is present, it means AuthProvider has finished loading user data
      expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    });

    await api.get('/api/v1/some-protected-data').catch(() => {});

    expect(currentHref).toContain('/login');
  });
});
