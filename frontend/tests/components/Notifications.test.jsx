import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import Notifications from '../../src/pages/Notifications';
import * as notificationService from '../../src/services/notificationService';

// Mock the notification service
vi.mock('../../src/services/notificationService', () => ({
  getNotifications: vi.fn(),
  markOneRead: vi.fn(),
  markAllRead: vi.fn(),
}));

const mockNotifications = {
  notifications: [
    {
      id: 1,
      type: 'booking',
      title: 'Booking Confirmed',
      message: 'Your booking #123 is confirmed.',
      read_at: null,
      created_at: '2026-07-26T10:00:00Z',
      metadata: { bookingId: 123 },
    },
    {
      id: 2,
      type: 'payment',
      title: 'Payment Received',
      message: 'Payment for #123 received.',
      read_at: '2026-07-26T10:05:00Z',
      created_at: '2026-07-26T10:00:00Z',
    },
  ],
  total: 2,
  totalPages: 1,
  page: 1,
  pageSize: 20,
};

describe('Notifications Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    notificationService.getNotifications.mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders notifications successfully', async () => {
    notificationService.getNotifications.mockResolvedValue(mockNotifications);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(screen.getByText('View booking #123')).toBeInTheDocument();

    // Unread notification should have "New" badge
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('handles mark one read', async () => {
    notificationService.getNotifications.mockResolvedValue(mockNotifications);
    notificationService.markOneRead.mockResolvedValue({ success: true });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmed')).toBeInTheDocument();
    });

    const markReadBtn = screen.getByRole('button', { name: /Mark "Booking Confirmed" as read/i });
    fireEvent.click(markReadBtn);

    expect(notificationService.markOneRead).toHaveBeenCalledWith(1);
  });

  it('handles mark all read', async () => {
    notificationService.getNotifications.mockResolvedValue(mockNotifications);
    notificationService.markAllRead.mockResolvedValue({ success: true });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark all as read'));
    expect(notificationService.markAllRead).toHaveBeenCalled();
  });

  it('displays empty state when no notifications', async () => {
    notificationService.getNotifications.mockResolvedValue({ notifications: [], totalPages: 1 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });
});
