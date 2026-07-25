import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPayments from './AdminPayments';
import * as paymentService from '../../services/paymentService';
import * as authContext from '../../context/AuthContext';
import { vi } from 'vitest';

vi.mock('../../services/paymentService', () => ({
  getAllPayments: vi.fn(),
  refundPayment: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AdminPayments Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContext.useAuth.mockReturnValue({ user: { id: 1, role: 'admin' }, logout: vi.fn() });
  });

  test('Refund shows Confirm Refund and Cancel; Cancel does not call API', async () => {
    paymentService.getAllPayments.mockResolvedValue({
      data: { success: true, data: { payments: [{ id: 1, payment_status: 'completed', amount: 100, first_name: 'John', last_name: 'Doe', hotel_name: 'Hotel' }] } }
    });

    render(<MemoryRouter><AdminPayments /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const refundBtn = screen.getByRole('button', { name: 'Refund' });
    fireEvent.click(refundBtn);

    expect(screen.getByRole('button', { name: 'Confirm Refund' })).toBeInTheDocument();
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    fireEvent.click(cancelBtn);

    expect(paymentService.refundPayment).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirm Refund' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument();
  });

  test('confirmation calls refundPayment; success refreshes payments', async () => {
    paymentService.getAllPayments.mockResolvedValueOnce({
      data: { success: true, data: { payments: [{ id: 1, payment_status: 'completed', amount: 100, first_name: 'John', last_name: 'Doe', hotel_name: 'Hotel' }] } }
    }).mockResolvedValueOnce({
      data: { success: true, data: { payments: [{ id: 1, payment_status: 'refunded', amount: 100, first_name: 'John', last_name: 'Doe', hotel_name: 'Hotel' }] } }
    });
    paymentService.refundPayment.mockResolvedValue({});

    render(<MemoryRouter><AdminPayments /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Refund' }));

    await waitFor(() => {
      expect(paymentService.refundPayment).toHaveBeenCalledWith(1);
      expect(paymentService.getAllPayments).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: 'Confirm Refund' })).not.toBeInTheDocument();
    });
  });

  test('failure displays the API error', async () => {
    paymentService.getAllPayments.mockResolvedValue({
      data: { success: true, data: { payments: [{ id: 1, payment_status: 'completed', amount: 100, first_name: 'John', last_name: 'Doe', hotel_name: 'Hotel' }] } }
    });
    paymentService.refundPayment.mockRejectedValue({ response: { data: { message: 'Refund failed' } } });

    render(<MemoryRouter><AdminPayments /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Refund' }));

    await waitFor(() => {
      expect(screen.getByText('Refund failed')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Confirm Refund' })).not.toBeInTheDocument();
    });
  });
});
