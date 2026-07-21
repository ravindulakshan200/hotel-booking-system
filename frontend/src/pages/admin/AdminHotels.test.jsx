import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminHotels from './AdminHotels';
import { getHotels } from '../../services/hotelService';
import { createHotel, updateHotel, deleteHotel } from '../../services/adminService';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock('../../services/hotelService');
vi.mock('../../services/adminService');

// ── AuthContext mock ──────────────────────────────────────────────────────────
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' }, token: 'fake-token', loading: false }),
  AuthProvider: ({ children }) => <>{children}</>
}));

// ── Shared fixtures ───────────────────────────────────────────────────────────
const mockSuccessData = {
  data: {
    data: {
      hotels: [
        { id: 1, name: 'Hotel One', city: 'Colombo', address: '123 Galle Rd', description: 'desc 1' },
        { id: 2, name: 'Hotel Two', city: 'Kandy', address: '456 Hill St', description: 'desc 2' }
      ]
    }
  }
};

const renderAdminHotels = () =>
  render(
    <BrowserRouter>
      <AdminHotels />
    </BrowserRouter>
  );

describe('AdminHotels Modal and Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHotels.mockResolvedValue(mockSuccessData);
  });

  test('Add Hotel modal opens from the button', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    const addButton = screen.getByText('+ Add Hotel');
    fireEvent.click(addButton);

    expect(screen.getByText('Add Hotel')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('It remains mounted after asynchronous hotel data/state updates and typing preserves value', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+ Add Hotel'));
    expect(screen.getByText('Add Hotel')).toBeInTheDocument();

    const nameInput = screen.getAllByRole('textbox')[0]; // First textbox is usually Name

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Hotel Name' } });
    });

    expect(nameInput.value).toBe('New Hotel Name');
    expect(screen.getByText('Add Hotel')).toBeInTheDocument();
  });

  test('Clicking inside does not close the modal, clicking Cancel does', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+ Add Hotel'));

    const dialog = screen.getByText('Add Hotel').closest('.modal-dialog');
    fireEvent.click(dialog);

    expect(screen.getByText('Add Hotel')).toBeInTheDocument();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Add Hotel')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  test('Edit modal still opens correctly', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Hotel')).toBeInTheDocument();

    const nameInput = screen.getAllByRole('textbox')[0];
    expect(nameInput.value).toBe('Hotel One');
  });

  test('No unnecessary repeated hotel requests occur due to opening the modal', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    expect(getHotels).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('+ Add Hotel'));

    const nameInput = screen.getAllByRole('textbox')[0];
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Type something' } });
    });

    expect(getHotels).toHaveBeenCalledTimes(1);
  });
});
