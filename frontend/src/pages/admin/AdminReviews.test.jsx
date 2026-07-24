import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminReviews from './AdminReviews';
import { getAllReviewsAdmin, deleteReview } from '../../services/adminService';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../services/adminService');

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' }, token: 'fake-token', loading: false }),
  AuthProvider: ({ children }) => <>{children}</>
}));

const mockReviewsData = {
  data: {
    data: {
      reviews: [
        { id: 101, hotel_name: 'Hotel One', first_name: 'John', last_name: 'Doe', rating: 5, comment: 'Great', created_at: '2030-01-01' }
      ]
    }
  }
};

const renderComponent = () =>
  render(
    <BrowserRouter>
      <AdminReviews />
    </BrowserRouter>
  );

describe('AdminReviews Delete Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllReviewsAdmin.mockResolvedValue(mockReviewsData);
  });

  test('Clicking Delete displays Yes and No confirmation buttons', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  test('Clicking No cancels without calling deleteReview', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(deleteReview).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Yes' })).not.toBeInTheDocument();
  });

  test('Clicking Yes calls deleteReview with the correct review ID and refreshes', async () => {
    deleteReview.mockResolvedValue({ data: { success: true } });
    renderComponent();
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(deleteReview).toHaveBeenCalledWith(101);
      expect(getAllReviewsAdmin).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });

  test('Failed deletion displays the API error message', async () => {
    deleteReview.mockRejectedValue({ response: { data: { message: 'Deletion failed' } } });
    renderComponent();
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(screen.getByText('Deletion failed')).toBeInTheDocument();
    });
  });
});
