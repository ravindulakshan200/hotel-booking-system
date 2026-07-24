import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HotelDetails from './HotelDetails';
import * as hotelService from '../services/hotelService';
import * as roomService from '../services/roomService';
import * as reviewService from '../services/reviewService';
import * as favoriteService from '../services/favoriteService';
import { vi } from 'vitest';
import * as authContext from '../context/AuthContext';

vi.mock('../services/hotelService', () => ({
  getHotelById: vi.fn(),
}));
vi.mock('../services/roomService', () => ({
  getRoomsByHotel: vi.fn(),
}));
vi.mock('../services/reviewService', () => ({
  getHotelReviews: vi.fn(),
}));
vi.mock('../services/favoriteService', () => ({
  getMyFavorites: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('HotelDetails Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContext.useAuth.mockReturnValue({ user: null });
  });

  test('Renders safe Google Maps link instead of iframe', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: {
        success: true,
        data: {
          hotel: {
            id: 1,
            name: 'Map Hotel',
            address: '123 Test St',
            city: 'Test City',
            description: 'Test Desc',
            map_url: 'https://maps.app.goo.gl/abcxyz',
            image_url: 'https://example.com/img.jpg',
            amenities: []
          }
        }
      }
    });
    roomService.getRoomsByHotel.mockResolvedValue({ data: { data: { rooms: [] } } });
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Map Hotel')).toBeInTheDocument();
    });

    // Verify the safe link exists
    const mapLink = screen.getByRole('link', { name: /view on google maps/i });
    expect(mapLink).toBeInTheDocument();
    expect(mapLink).toHaveAttribute('href', 'https://maps.app.goo.gl/abcxyz');
    expect(mapLink).toHaveAttribute('target', '_blank');
    expect(mapLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
