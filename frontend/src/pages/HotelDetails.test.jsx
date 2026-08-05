import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
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
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
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

  test('An empty rooms response still renders the hotel', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Empty Rooms Hotel', amenities: [] } } }
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

    await waitFor(() => {
      expect(screen.getByText('Empty Rooms Hotel')).toBeInTheDocument();
    });
  });

  test('A failed rooms request still renders hotel information with a safe no-rooms state', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Failed Rooms Hotel', amenities: [] } } }
    });
    roomService.getRoomsByHotel.mockRejectedValue(new Error('Rooms API failed'));
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed Rooms Hotel')).toBeInTheDocument();
    });
  });

  test('A failed main hotel request still shows the details error', async () => {
    hotelService.getHotelById.mockRejectedValue(new Error('Hotel API failed'));
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

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch hotel details')).toBeInTheDocument();
    });
  });

  test('favorite update failure renders inline feedback and restores loading state', async () => {
    authContext.useAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });

    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Fav Hotel', amenities: [] } } }
    });
    roomService.getRoomsByHotel.mockResolvedValue({ data: { data: { rooms: [] } } });
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });
    favoriteService.addFavorite.mockRejectedValue(new Error('API failed'));

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Fav Hotel')).toBeInTheDocument();
    });

    const favButton = screen.getByRole('button', { name: /add to favorites/i });
    fireEvent.click(favButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update favorites')).toBeInTheDocument();
      expect(favButton).not.toBeDisabled();
    });
  });

  test('HotelDetails renders the room image when present', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Room Image Hotel', amenities: [] } } }
    });
    roomService.getRoomsByHotel.mockResolvedValue({
      data: { data: { rooms: [{ id: 101, room_number: '101', image_url: 'https://example.com/room101.jpg' }] } }
    });
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Room Image Hotel')).toBeInTheDocument();
    });

    const roomImage = screen.getByTestId('room-image-101');
    expect(roomImage).toBeInTheDocument();
    expect(roomImage).toHaveAttribute('src', 'https://example.com/room101.jpg');
  });

  test('missing image URL uses the fallback immediately', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Fallback Image Hotel', amenities: [] } } }
    });
    // Room with NO image_url
    roomService.getRoomsByHotel.mockResolvedValue({
      data: { data: { rooms: [{ id: 102, room_number: '102', image_url: null }] } }
    });
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Fallback Image Hotel')).toBeInTheDocument();
    });

    // Check missing image fallback
    const roomImage = screen.getByTestId('room-image-102');
    expect(roomImage).toHaveAttribute('src', '/images/default-hotel.svg');
  });

  test('broken image URL uses the fallback on error and prevents infinite loops', async () => {
    hotelService.getHotelById.mockResolvedValue({
      data: { success: true, data: { hotel: { id: 1, name: 'Broken Image Hotel', amenities: [] } } }
    });
    // Room with broken image_url
    roomService.getRoomsByHotel.mockResolvedValue({
      data: { data: { rooms: [{ id: 103, room_number: '103', image_url: 'https://example.com/broken-room.jpg' }] } }
    });
    reviewService.getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
    favoriteService.getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

    render(
      <MemoryRouter initialEntries={['/hotel/1']}>
        <Routes>
          <Route path="/hotel/:id" element={<HotelDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Broken Image Hotel')).toBeInTheDocument();
    });

    const roomImage = screen.getByTestId('room-image-103');

    // confirm the original URL is rendered
    expect(roomImage).toHaveAttribute('src', 'https://example.com/broken-room.jpg');

    // fire the error event
    fireEvent.error(roomImage);

    // confirm it changes to DEFAULT_ROOM_IMAGE
    expect(roomImage).toHaveAttribute('src', '/images/default-hotel.svg');

    // fire a second error event
    fireEvent.error(roomImage);

    // confirm it remains DEFAULT_ROOM_IMAGE without another replacement loop
    expect(roomImage).toHaveAttribute('src', '/images/default-hotel.svg');
  });
});
