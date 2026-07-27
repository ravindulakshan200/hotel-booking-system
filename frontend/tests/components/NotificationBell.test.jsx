import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import NotificationBell from '../../src/components/NotificationBell';
import * as AuthContextModule from '../../src/context/AuthContext';
import * as notificationService from '../../src/services/notificationService';

vi.mock('../../src/services/notificationService', () => ({
  getUnreadCount: vi.fn(),
  getNotifications: vi.fn(),
}));

describe('NotificationBell', () => {
  let useAuthSpy;

  beforeEach(() => {
    vi.resetAllMocks();
    useAuthSpy = vi.spyOn(AuthContextModule, 'useAuth');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (user = { id: 1, first_name: 'John' }) => {
    useAuthSpy.mockReturnValue({ user, logout: vi.fn() });
    return render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
  };

  it('does not render if user is not authenticated', () => {
    renderComponent(null);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fetches and displays unread count on mount', async () => {
    notificationService.getUnreadCount.mockResolvedValue({ count: 5 });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
    expect(notificationService.getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('polls for unread count every 30s', async () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    notificationService.getUnreadCount.mockResolvedValue({ count: 2 });

    const { unmount } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Check that setInterval was called with 30s
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    // Check that unmounting clears the interval
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
  it('opens dropdown and fetches recent notifications on click', async () => {
    notificationService.getUnreadCount.mockResolvedValue({ count: 0 });
    notificationService.getNotifications.mockResolvedValue({
      notifications: [
        { id: 1, title: 'Test', message: 'Msg', created_at: '2026-07-26T10:00:00Z', type: 'system' }
      ]
    });

    renderComponent();

    const bellBtn = screen.getByRole('button');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    expect(notificationService.getNotifications).toHaveBeenCalledWith(1, 5);
  });
});
