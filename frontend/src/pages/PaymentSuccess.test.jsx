import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PaymentSuccess from './PaymentSuccess';
import { confirmSession } from '../services/paymentService';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../services/paymentService', () => ({
  confirmSession: vi.fn(),
}));

describe('PaymentSuccess Component', () => {
  it('redirects to /hotels if no session_id is present', async () => {
    let locationPath = '';
    render(
      <MemoryRouter initialEntries={['/payment-success']}>
        <Routes>
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/hotels" element={<div data-testid="hotels-page">Hotels Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('hotels-page')).toBeInTheDocument();
  });

  it('shows processing state initially', () => {
    confirmSession.mockReturnValue(new Promise(() => {})); // pending promise
    render(
      <MemoryRouter initialEntries={['/payment-success?session_id=cs_test_123']}>
        <Routes>
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Processing Payment/i)).toBeInTheDocument();
  });

  it('shows success state when confirmSession succeeds', async () => {
    confirmSession.mockResolvedValueOnce({ data: { success: true } });
    render(
      <MemoryRouter initialEntries={['/payment-success?session_id=cs_test_123']}>
        <Routes>
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment Successful!/i)).toBeInTheDocument();
    });
  });

  it('shows error state when confirmSession fails', async () => {
    confirmSession.mockRejectedValueOnce({
      response: { data: { message: 'Already paid' } },
    });
    render(
      <MemoryRouter initialEntries={['/payment-success?session_id=cs_test_123']}>
        <Routes>
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Already paid/i)).toBeInTheDocument();
    });
  });
});
