import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
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

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useLocation: vi.fn(),
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
    useLocation.mockReturnValue({ state: { hotel: { name: 'Hotel' }, room: { price_per_night: 5000 }, checkIn: '2030-01-01', checkOut: '2030-01-02' } });
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  it('shows no payment method and disables submission when all payments are disabled', async () => {
    getPaymentConfig.mockResolvedValueOnce({ data: { data: { stripeEnabled: false, demoPaymentsEnabled: false } } });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Online payments are currently unavailable/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Pay with Card/i });
    expect(submitBtn).toBeDisabled();

    // Ensure no specific payment methods render
    expect(screen.queryByText('card')).not.toBeInTheDocument();
    expect(screen.queryByText('cash')).not.toBeInTheDocument();
  });

  it('exposes the real card method when Stripe is enabled', async () => {
    getPaymentConfig.mockResolvedValueOnce({ data: { data: { stripeEnabled: true, demoPaymentsEnabled: false } } });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('card')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pay with Card/i })).toBeInTheDocument();
    });
  });

  it('requires dates and a valid total before submission is enabled', async () => {
    useLocation.mockReturnValue({
      state: { hotel: { name: 'Hotel' }, room: { price_per_night: 5000 }, checkIn: '2030-01-01', checkOut: '2030-01-01' } // Same day, total nights = 0
    });

    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    const payButton = screen.getByRole('button', { name: /Pay with Card/i });
    expect(payButton).toBeDisabled();
  });

  it('renders hotel name and location with text-white for WCAG contrast on dark background', async () => {
    render(
      <MemoryRouter>
        <Booking />
      </MemoryRouter>
    );

    const hotelName = await screen.findByText('Hotel');
    expect(hotelName).toHaveClass('text-white');

    // The state in our mock has no city, but it renders ", Sri Lanka". We can match by text.
    const location = await screen.findByText(/, Sri Lanka/i);
    expect(location).toHaveClass('text-white');
  });
});
