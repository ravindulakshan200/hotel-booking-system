import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Hotels from './Hotels';
import * as hotelService from '../services/hotelService';
import { vi } from 'vitest';

vi.mock('../services/hotelService', () => ({
  getHotels: vi.fn(),
  checkAvailability: vi.fn(),
}));

describe('Hotels Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('missing availability inputs render the existing page error state; search request is not called', async () => {
    hotelService.getHotels.mockResolvedValue({
      data: { success: true, data: { hotels: [] } }
    });

    const { container } = render(
      <MemoryRouter>
        <Hotels />
      </MemoryRouter>
    );

    // Initial load
    await waitFor(() => {
      expect(hotelService.getHotels).toHaveBeenCalled();
    });

    // Try submitting without check-in, check-out, guests
    const searchBtn = container.querySelector('button[type="submit"]');
    fireEvent.click(searchBtn);
    const form = container.querySelector('form');
    fireEvent.submit(form);

    // Expect inline error and no checkAvailability call
    await waitFor(() => {
      expect(screen.getByText('Check-in, Check-out, and Guests are required for availability search.')).toBeInTheDocument();
      expect(hotelService.checkAvailability).not.toHaveBeenCalled();
    });
  });
});
