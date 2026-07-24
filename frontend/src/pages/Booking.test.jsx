import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Booking from './Booking';
import { createCheckoutSession, getPaymentConfig } from '../services/paymentService';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../services/paymentService', () => ({
  createCheckoutSession: vi.fn(),
  getPaymentConfig: vi.fn(),
}));

vi.mock('../services/bookingService', () => ({
  createBooking: vi.fn().mockResolvedValue({ data: { data: { booking: { id: 1 } } } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ state: { hotel: { name: 'Hotel' }, room: { price_per_night: 5000 }, checkIn: '2030-01-01', checkOut: '2030-01-02' } }),
  };
});

describe('Booking Component Tests', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    delete window.location;
    window.location = { href: '' };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentConfig.mockResolvedValue({ data: { data: { stripeEnabled: true } } });
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  it('prevents duplicate submissions by disabling button', async () => {
    createCheckoutSession.mockReturnValue(new Promise(() => {})); // Hangs forever

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay with Card/i });
    fireEvent.submit(payButton.closest('form'));

    expect(payButton).toBeDisabled();
    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    });

    // Clicking again should not trigger API
    fireEvent.click(payButton);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('redirects to secure server-returned HTTPS URL', async () => {
    createCheckoutSession.mockResolvedValueOnce({ data: { data: { url: 'https://checkout.stripe.com/c/pay/cs_test_123' } } });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay with Card/i });
    fireEvent.submit(payButton.closest('form'));

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    });
  });

  it('shows error if checkout URL is missing', async () => {
    createCheckoutSession.mockResolvedValueOnce({ data: { data: { url: null } } });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay with Card/i });
    fireEvent.submit(payButton.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to initiate secure checkout/i)).toBeInTheDocument();
    });
  });

  it('hides card payment option when Stripe is disabled', async () => {
    getPaymentConfig.mockResolvedValueOnce({ data: { data: { stripeEnabled: false } } });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('card')).not.toBeInTheDocument();
      expect(screen.getByText('cash')).toBeInTheDocument();
      expect(screen.getByText('online')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pay with Card/i })).not.toBeInTheDocument();
    });
  });
});
