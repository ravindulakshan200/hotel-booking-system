import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Home from './pages/Home';
import Hotels from './pages/Hotels';
import * as hotelService from './services/hotelService';

vi.mock('./services/hotelService', () => ({
  getHotels: vi.fn(() => Promise.resolve({ data: { data: { hotels: [] } } })),
  searchAvailability: vi.fn(() => Promise.resolve({ data: { data: { hotels: [] } } })),
}));

describe('Search and Availability Flow', () => {
  it('Home page renders search panel with correct inputs', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/Where to/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-In/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-Out/i)).toBeInTheDocument();
    expect(screen.getByText(/Guests/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('Hotels page calls getHotels when no dates are provided', async () => {
    render(
      <MemoryRouter initialEntries={['/hotels']}>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(hotelService.getHotels).toHaveBeenCalled();
    });
  });

  it('Hotels page calls searchAvailability when dates and guests are provided', async () => {
    render(
      <MemoryRouter initialEntries={['/hotels?check_in=2026-07-20&check_out=2026-07-25&guests=2']}>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(hotelService.searchAvailability).toHaveBeenCalledWith(expect.objectContaining({
        check_in: '2026-07-20',
        check_out: '2026-07-25',
        guests: '2'
      }));
    });
  });
});
