import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Favorites from './Favorites';
import * as favoriteService from '../services/favoriteService';
import { vi } from 'vitest';

vi.mock('../services/favoriteService', () => ({
  getMyFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));

describe('Favorites Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent alert from being called unexpectedly
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  test('removal success updates the list and does not call window.alert', async () => {
    favoriteService.getMyFavorites.mockResolvedValue({
      data: { data: { favorites: [{ id: 1, favorite_id: 101, name: 'Hotel One', city: 'Colombo' }] } }
    });
    favoriteService.removeFavorite.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hotel One')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(favoriteService.removeFavorite).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Hotel One')).not.toBeInTheDocument();
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  test('removal failure renders an inline error and does not call window.alert', async () => {
    favoriteService.getMyFavorites.mockResolvedValue({
      data: { data: { favorites: [{ id: 1, favorite_id: 101, name: 'Hotel One', city: 'Colombo' }] } }
    });
    favoriteService.removeFavorite.mockRejectedValue(new Error('Failed to remove'));

    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hotel One')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to remove favorite')).toBeInTheDocument();
      expect(window.alert).not.toHaveBeenCalled();
      // List should still have the item
      expect(screen.getByText('Hotel One')).toBeInTheDocument();
    });
  });
});
