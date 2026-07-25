import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyBookings from './MyBookings';
import * as bookingService from '../services/bookingService';
import { vi } from 'vitest';

vi.mock('../services/bookingService', () => ({
  getMyBookings: vi.fn(),
  cancelBooking: vi.fn(),
}));

describe('MyBookings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Cancel click shows Confirm and Keep; Keep does not call API', async () => {
    bookingService.getMyBookings.mockResolvedValue({
      data: { success: true, data: { bookings: [{ id: 1, booking_status: 'confirmed', check_in_date: '2050-01-01', hotel_name: 'Test', totalPrice: 100 }] } }
    });

    render(<MemoryRouter><MyBookings /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    // Confirm and Keep should appear
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    const keepBtn = screen.getByRole('button', { name: 'Keep' });

    fireEvent.click(keepBtn);

    expect(bookingService.cancelBooking).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  test('Confirm calls cancelBooking; success refreshes bookings', async () => {
    bookingService.getMyBookings.mockResolvedValueOnce({
      data: { success: true, data: { bookings: [{ id: 1, booking_status: 'pending', check_in_date: '2050-01-01', hotel_name: 'Test', totalPrice: 100 }] } }
    }).mockResolvedValueOnce({
      data: { success: true, data: { bookings: [{ id: 1, booking_status: 'cancelled', check_in_date: '2050-01-01', hotel_name: 'Test', totalPrice: 100 }] } }
    });
    bookingService.cancelBooking.mockResolvedValue({});

    render(<MemoryRouter><MyBookings /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(1);
      expect(bookingService.getMyBookings).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    });
  });

  test('failure displays the API error and closes confirm state', async () => {
    bookingService.getMyBookings.mockResolvedValue({
      data: { success: true, data: { bookings: [{ id: 1, booking_status: 'confirmed', check_in_date: '2050-01-01', hotel_name: 'Test', totalPrice: 100 }] } }
    });
    bookingService.cancelBooking.mockRejectedValue({ response: { data: { message: 'Cannot cancel' } } });

    render(<MemoryRouter><MyBookings /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot cancel')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });
});
