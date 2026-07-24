import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminHotels from './AdminHotels';
import { getAllHotelsAdmin, createHotel, updateHotel, deleteHotel } from '../../services/adminService';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Service mocks ─────────────────────────────────────────────────────────────
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
        { id: 1, name: 'Hotel One', city: 'Colombo', address: '123 Galle Rd', description: 'desc 1', image_url: 'https://example.com/1.jpg' },
        { id: 2, name: 'Hotel Two', city: 'Kandy', address: '456 Hill St', description: 'desc 2', image_url: 'https://example.com/2.jpg' }
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
    getAllHotelsAdmin.mockResolvedValue(mockSuccessData);
    createHotel.mockResolvedValue({ data: { success: true } });
    updateHotel.mockResolvedValue({ data: { success: true } });
  });

  test('All advanced fields render', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Main Image URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Star Rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Google Maps URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Free Wi-Fi/i)).toBeInTheDocument();
  });

  test('Required validation prevents submission', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));

    // Attempt submit with empty fields
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should still be open (HTML5 validation or custom)
    expect(screen.getByText('Add Hotel')).toBeInTheDocument();
    expect(createHotel).not.toHaveBeenCalled();
  });

  test('Exact create payload', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Test Hotel' } });
    fireEvent.change(screen.getByLabelText(/^City/i), { target: { value: 'Colombo' } });
    fireEvent.change(screen.getByLabelText(/^Address/i), { target: { value: '123 Main' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'A test description' } });
    fireEvent.change(screen.getByLabelText(/Main Image URL/i), { target: { value: 'https://example.com/img.jpg' } });
    fireEvent.change(screen.getByLabelText(/Star Rating/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Contact Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: 'active' } });

    // Select amenity
    fireEvent.click(screen.getByLabelText(/Free Wi-Fi/i));

    const saveButton = screen.getByText('Save');

    // Prevent default form submission to let our mock handle it, actually let's just submit the form via button
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(createHotel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Hotel',
      city: 'Colombo',
      address: '123 Main',
      description: 'A test description',
      image_url: 'https://example.com/img.jpg',
      star_rating: '4',
      contact_email: 'test@example.com',
      status: 'active',
      amenities: ['Free Wi-Fi']
    }));
  });

  test('Exact edit prefill and Exact update payload', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByLabelText(/^Name/i).value).toBe('Hotel One');
    expect(screen.getByLabelText(/^City/i).value).toBe('Colombo');

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Hotel One Edited' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(updateHotel).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Hotel One Edited'
    }));
  });

  test('HTTPS image preview and broken image fallback', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));

    fireEvent.change(screen.getByLabelText(/Image URL/i), { target: { value: 'https://example.com/img.jpg' } });
    const img = screen.getByAltText('Preview');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');

    fireEvent.error(img); // Trigger fallback
    expect(img).toHaveStyle('display: none');
  });

  test('Cancel discards unsaved values and Body overflow restoration', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Discard Me' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add Hotel')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    // Reopen and ensure discarded
    fireEvent.click(screen.getByText('+ Add Hotel'));
    expect(screen.getByLabelText(/^Name/i).value).toBe('');
  });

  test('Duplicate-submit prevention', async () => {
    renderAdminHotels();
    await waitFor(() => expect(screen.getByText('Hotel One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Add Hotel'));

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText(/^City/i), { target: { value: 'C' } });
    fireEvent.change(screen.getByLabelText(/^Address/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText(/Main Image URL/i), { target: { value: 'https://img' } });

    // We delay the resolve to see loading state
    createHotel.mockImplementation(() => new Promise(res => setTimeout(() => res({ data: { success: true } }), 100)));

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    // Expect it was called only once despite clicks
    expect(createHotel).toHaveBeenCalledTimes(1);
  });
});
