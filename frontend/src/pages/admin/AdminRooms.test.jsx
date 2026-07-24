import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminRooms from './AdminRooms';
import { getHotels } from '../../services/hotelService';
import { getAllRooms, deleteRoom, createRoom, updateRoom } from '../../services/adminService';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../services/adminService');
vi.mock('../../services/hotelService');

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' }, token: 'fake-token', loading: false }),
  AuthProvider: ({ children }) => <>{children}</>
}));

const mockRoomsData = {
  data: {
    data: {
      rooms: [
        { id: 201, hotel_id: 1, room_number: '101A', room_type: 'single', price_per_night: 5000, capacity: 2, availability_status: 'available' }
      ]
    }
  }
};

const mockHotelsData = {
  data: {
    data: {
      hotels: [
        { id: 1, name: 'Hotel One' }
      ]
    }
  }
};

const renderComponent = () =>
  render(
    <BrowserRouter>
      <AdminRooms />
    </BrowserRouter>
  );

describe('AdminRooms Delete Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllRooms.mockResolvedValue(mockRoomsData);
    getHotels.mockResolvedValue(mockHotelsData);
  });

  test('Clicking Delete displays Yes, Delete and Cancel buttons', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('101A')).toBeInTheDocument());

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  test('Clicking Cancel does not call deleteRoom', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('101A')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Yes, Delete' })).not.toBeInTheDocument();
  });

  test('Clicking Yes, Delete calls deleteRoom with the correct room ID and refreshes', async () => {
    deleteRoom.mockResolvedValue({ data: { success: true } });
    renderComponent();
    await waitFor(() => expect(screen.getByText('101A')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(deleteRoom).toHaveBeenCalledWith(201);
      expect(getAllRooms).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });

  test('Failed deletion displays the API error message', async () => {
    deleteRoom.mockRejectedValue({ response: { data: { message: 'Room deletion failed' } } });
    renderComponent();
    await waitFor(() => expect(screen.getByText('101A')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Room deletion failed')).toBeInTheDocument();
    });
  });
});
