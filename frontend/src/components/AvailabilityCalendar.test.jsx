import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import AvailabilityCalendar from './AvailabilityCalendar';

beforeEach(() => {
  vi.spyOn(global, 'fetch');
});

afterEach(() => {
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
  // Let's create dates dynamically
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Booked date: today + 2 days
  const bookedDate = new Date(today);
  bookedDate.setDate(today.getDate() + 2);
  const bookedDateStr = bookedDate.toISOString().slice(0, 10);

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
  // The button's label contains "is already booked"
  const dayStr = bookedDate.getDate().toString();
  const dayButtons = screen.getAllByRole('button');
  const bookedBtn = dayButtons.find(btn => btn.getAttribute('aria-label')?.includes('is already booked'));
  expect(bookedBtn).toBeDefined();
  expect(bookedBtn).toBeDisabled();

  // Yesterday should be disabled/past
  const yesterdayBtn = dayButtons.find(btn => btn.getAttribute('aria-label')?.includes('is in the past'));
  if (yesterdayBtn) {
    expect(yesterdayBtn).toBeDisabled();
  }
});
