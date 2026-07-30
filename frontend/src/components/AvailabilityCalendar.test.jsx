import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import AvailabilityCalendar from './AvailabilityCalendar';

beforeEach(() => {
  vi.spyOn(global, 'fetch');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('renders header and handles fetch lifecycle', async () => {
  const mockDates = ['2026-08-05', '2026-08-06'];
  global.fetch.mockResolvedValue({
    json: () => Promise.resolve({
      success: true,
      data: { unavailable_dates: mockDates }
    })
  });

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  // Wait for data to load
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });

  const callUrl = global.fetch.mock.calls[0][0];
  expect(callUrl).toContain('/api/v1/rooms/123/availability');
});

test('disables busy and past dates', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-08-10T12:00:00.000Z'));

  const bookedDateStr = '2026-08-12';

  global.fetch.mockResolvedValue({
    json: () => Promise.resolve({
      success: true,
      data: { unavailable_dates: [bookedDateStr] }
    })
  });

  render(<AvailabilityCalendar roomId={123} onSelectRange={() => {}} />);

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });

  // Check that the booked date button is disabled
  const bookedBtn = await screen.findByRole('button', { name: /is already booked/i });
  expect(bookedBtn).toBeDisabled();

  // Yesterday should be disabled/past
  const pastBtns = await screen.findAllByRole('button', { name: /is in the past/i });
  expect(pastBtns[0]).toBeDisabled();
});
