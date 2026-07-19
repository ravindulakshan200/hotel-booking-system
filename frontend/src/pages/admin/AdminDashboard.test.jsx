import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { getDashboardStats } from '../../services/adminService';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { formatCurrency } from '../../utils/formatters';

// ── Service mock ─────────────────────────────────────────────────────────────
vi.mock('../../services/adminService');

// ── Recharts mock — swap ResponsiveContainer so JSDOM doesn't need ResizeObserver
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="chart-container" style={{ width: 800, height: 300 }}>
        {children}
      </div>
    ),
  };
});

// ── AuthContext mock ──────────────────────────────────────────────────────────
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' }, token: 'fake-token', loading: false }),
}));

// ── Shared fixtures ───────────────────────────────────────────────────────────
const mockSuccessData = {
  data: {
    data: {
      overview: {
        period_revenue: 15000,
        total_bookings: 5,
        confirmed_bookings: 3,
        occupancy_rate: 65,
        total_users: 10,
        total_rooms: 20,
      },
      charts: {
        bookingTrend: [{ label: '2023-01', bookings: 2, revenue: 5000 }],
        statusBreakdown: [{ name: 'confirmed', value: 3 }],
        popularHotels: [{ name: 'Test Hotel', bookings: 3 }],
      },
      recentBookings: [
        {
          id: 1,
          guest_name: 'John Doe',
          hotel_name: 'Test Hotel',
          room_number: '101',
          check_in: '2023-01-01',
          total_price: 5000,
          status: 'confirmed',
        },
      ],
    },
  },
};

const renderDashboard = () =>
  render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  test('shows loading spinner before data resolves', () => {
    // Never resolves during this test
    getDashboardStats.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    // Component renders without crashing in loading state
  });

  // ── Successful data render ─────────────────────────────────────────────────
  test('renders KPI labels after data loads', async () => {
    getDashboardStats.mockResolvedValueOnce(mockSuccessData);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Admin Analytics')).toBeInTheDocument();
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
      expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
    });
  });

  // ── LKR currency formatting ────────────────────────────────────────────────
  test('formatCurrency returns LKR-prefixed string for positive amount', () => {
    const result = formatCurrency(15000);
    expect(result).toMatch(/^LKR/);
    expect(result).toMatch(/15/); // number appears somewhere
  });

  test('formatCurrency handles zero correctly', () => {
    expect(formatCurrency(0)).toMatch(/^LKR/);
  });

  test('formatCurrency handles null/undefined without throwing', () => {
    expect(() => formatCurrency(null)).not.toThrow();
    expect(() => formatCurrency(undefined)).not.toThrow();
    expect(formatCurrency(null)).toMatch(/^LKR/);
  });

  // ── Chart safety — containers render without ResizeObserver crash ──────────
  test('chart containers render in DOM (ResizeObserver mock)', async () => {
    getDashboardStats.mockResolvedValueOnce(mockSuccessData);
    renderDashboard();
    await waitFor(() => {
      const containers = screen.getAllByTestId('chart-container');
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  // ── Recent bookings table ─────────────────────────────────────────────────
  test('renders recent bookings row with guest name', async () => {
    getDashboardStats.mockResolvedValueOnce(mockSuccessData);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Hotel')).toBeInTheDocument();
    });
  });

  // ── Period switching ───────────────────────────────────────────────────────
  test('changing period calls getDashboardStats with new value', async () => {
    getDashboardStats.mockResolvedValue(mockSuccessData);
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Admin Analytics')).toBeInTheDocument());

    const select = screen.getByLabelText('Select Period');
    await act(async () => {
      fireEvent.change(select, { target: { value: '7days' } });
    });

    expect(getDashboardStats).toHaveBeenCalledWith('7days');
  });

  // ── API error state ────────────────────────────────────────────────────────
  test('shows error message when API call rejects', async () => {
    getDashboardStats.mockRejectedValueOnce(new Error('Network Error'));
    renderDashboard();
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load dashboard data/i)
      ).toBeInTheDocument();
    });
  });

  // ── Retry action ───────────────────────────────────────────────────────────
  test('clicking Retry calls the service again', async () => {
    getDashboardStats
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockSuccessData);

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Called twice: initial load (fail) + retry (succeed)
    expect(getDashboardStats).toHaveBeenCalledTimes(2);
  });

  // ── Empty data ────────────────────────────────────────────────────────────
  test('handles empty charts and bookings gracefully', async () => {
    getDashboardStats.mockResolvedValueOnce({
      data: {
        data: {
          overview: { period_revenue: 0, total_bookings: 0, confirmed_bookings: 0, occupancy_rate: 0, total_users: 0, total_rooms: 0 },
          charts: { bookingTrend: [], statusBreakdown: [], popularHotels: [] },
          recentBookings: [],
        },
      },
    });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No trend data for this period')).toBeInTheDocument();
      expect(screen.getByText('No recent bookings')).toBeInTheDocument();
    });
  });
});
