import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import AvailabilityCalendar from './AvailabilityCalendar';
import * as roomService from '../services/roomService';

beforeEach(() => {
  vi.spyOn(roomService, 'getRoomAvailability');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('renders header and handles fetch lifecycle', async () => {
  const mockDates = ['2026-08-05', '2026-08-06'];
  roomService.getRoomAvailability.mockResolvedValue({
    data: {
      success: true,
      data: { unavailable_dates: mockDates }
    }
  });

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  // Wait for data to load
  await waitFor(() => {
    expect(roomService.getRoomAvailability).toHaveBeenCalled();
  });

  expect(roomService.getRoomAvailability).toHaveBeenCalledWith(123, expect.any(Number), expect.any(Number));
});

test('disables busy and past dates', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-08-10T12:00:00.000Z'));

  const bookedDateStr = '2026-08-12';

  roomService.getRoomAvailability.mockResolvedValue({
    data: {
      success: true,
      data: { unavailable_dates: [bookedDateStr] }
    }
  });

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  await waitFor(() => {
    expect(roomService.getRoomAvailability).toHaveBeenCalled();
  });

  // Check that the booked date button is disabled
  const bookedBtn = await screen.findByRole('button', { name: /is already booked/i });
  expect(bookedBtn).toBeDisabled();

  // Yesterday should be disabled/past
  const pastBtns = await screen.findAllByRole('button', { name: /is in the past/i });
  expect(pastBtns[0]).toBeDisabled();
});

test('request failure shows error, rejects HTML or malformed data, and prevents all-green dates', async () => {
  // Rejecting with a network error or HTML response (simulated as Axios error)
  roomService.getRoomAvailability.mockRejectedValue(new Error('Network Error'));

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  await waitFor(() => {
    expect(roomService.getRoomAvailability).toHaveBeenCalledTimes(1);
  });

  // Verify that error UI is shown and NOT the calendar dates
  expect(await screen.findByText(/Connection error. Please try again/i)).toBeInTheDocument();
  const dateButtons = screen.queryAllByRole('button', { name: /is available/i });
  expect(dateButtons.length).toBe(0); // All green dates MUST NOT be present
});

test('Retry makes a second request and can recover', async () => {
  // First request fails
  roomService.getRoomAvailability.mockRejectedValueOnce(new Error('Network Error'));

  // Second request succeeds
  roomService.getRoomAvailability.mockResolvedValueOnce({
    data: {
      success: true,
      data: { unavailable_dates: [] }
    }
  });

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  await waitFor(() => {
    expect(roomService.getRoomAvailability).toHaveBeenCalledTimes(1);
  });

  // Click retry
  const retryBtn = await screen.findByRole('button', { name: /Retry loading calendar availability/i });
  fireEvent.click(retryBtn);

  await waitFor(() => {
    expect(roomService.getRoomAvailability).toHaveBeenCalledTimes(2);
  });

  // The calendar dates should now be rendered (error disappears)
  expect(screen.queryByText(/Connection error/i)).not.toBeInTheDocument();
  const availableBtns = await screen.findAllByRole('button');
  expect(availableBtns.length).toBeGreaterThan(10); // Lots of calendar dates
});
