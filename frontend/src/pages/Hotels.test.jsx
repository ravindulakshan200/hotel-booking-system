import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Hotels from './Hotels';
import * as hotelService from '../services/hotelService';
import { vi } from 'vitest';

vi.mock('../services/hotelService', () => ({
  getHotels: vi.fn(),
  searchAvailability: vi.fn(),
}));

describe('Hotels Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('missing availability inputs render the existing page error state; search request is not called', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: { success: true, items: [], total_items: 0, page: 1, limit: 9, total_pages: 1 }
    });

    const { container } = render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(hotelService.getHotels).toHaveBeenCalled();
    });

    const searchBtn = container.querySelector('button[type="submit"]');
    fireEvent.click(searchBtn);
    const form = container.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Check-in, Check-out, and Guests are required for availability search.')).toBeInTheDocument();
      expect(hotelService.searchAvailability).not.toHaveBeenCalled();
    });
  });

  test('a top-level items response renders the returned hotel card and total_items: 1 displays "1 Hotel Found"', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: {
        success: true,
        items: [{
          id: 1,
          name: 'Marino Beach Colombo',
          city: 'Colombo',
          min_price: 15000,
          image_url: '/test.webp',
          rating: 4.5,
          total_reviews: 10
        }],
        total_items: 1,
        page: 1,
        limit: 9,
        total_pages: 1
      }
    });

    render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1 Hotel Found')).toBeInTheDocument();
      expect(screen.getByText('Marino Beach Colombo')).toBeInTheDocument();
    });
  });

  test('plural totals display "Hotels Found"', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: {
        success: true,
        items: [
          { id: 1, name: 'Hotel One', city: 'Colombo', min_price: 1000 },
          { id: 2, name: 'Hotel Two', city: 'Colombo', min_price: 2000 }
        ],
        total_items: 2,
        page: 1,
        limit: 9,
        total_pages: 1
      }
    });

    render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 Hotels Found')).toBeInTheDocument();
    });
  });

  test('empty items displays the empty state', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: {
        success: true,
        items: [],
        total_items: 0,
        page: 1,
        limit: 9,
        total_pages: 1
      }
    });

    render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 Hotels Found')).toBeInTheDocument();
      expect(screen.getByText(/No hotels found/i)).toBeInTheDocument();
      expect(screen.getByText(/No hotels available right now/i)).toBeInTheDocument();
    });
  });

  test('an API failure displays the error state instead of a false "No hotels found" result', async () => {
    hotelService.getHotels.mockRejectedValue({
      response: { data: { message: 'Database connection failed' } }
    });

    render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText(/No hotels found/i)).not.toBeInTheDocument();
    });
  });

  test('pagination metadata is mapped correctly and pagination component renders', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: {
        success: true,
        items: [
          { id: 1, name: 'Hotel Page 2', city: 'Colombo', min_price: 1000 }
        ],
        total_items: 20,
        page: 2,
        limit: 9,
        total_pages: 3
      }
    });

    render(
      <MemoryRouter initialEntries={['/hotels?page=2']}>
        <Hotels />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('20 Hotels Found')).toBeInTheDocument();
    });

    // We verify pagination metadata by ensuring the pagination UI renders
    // page 2 out of 3, etc. This depends on Pagination component implementation.
    // It renders page buttons 1, 2, 3.
    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 3' })).toBeInTheDocument();
  });
});
