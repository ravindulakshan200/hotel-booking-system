import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import Home from './Home';
import { vi } from 'vitest';
import * as authContext from '../context/AuthContext';
import * as hotelService from '../services/hotelService';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/hotelService', () => ({
  getHotels: vi.fn(),
}));

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hotelService.getHotels.mockResolvedValue({
      data: { success: true, data: { hotels: [] } }
    });
  });

  test('logged-out users see SIGN UP FREE and it targets the registration route', async () => {
    authContext.useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

    const signUpButton = await screen.findByTestId('auth-cta-logged-out');
    expect(signUpButton).toBeInTheDocument();
    expect(signUpButton).toHaveTextContent(/SIGN UP FREE/i);
    expect(signUpButton).toHaveAttribute('href', '/register');
    expect(screen.queryByTestId('auth-cta-authenticated')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('authenticated users see VIEW MY BOOKINGS and it targets My Bookings route', async () => {
    authContext.useAuth.mockReturnValue({ user: { id: 1, name: 'Test User' }, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

    const bookingsButton = await screen.findByTestId('auth-cta-authenticated');
    expect(bookingsButton).toBeInTheDocument();
    expect(bookingsButton).toHaveTextContent(/VIEW MY BOOKINGS/i);
    expect(bookingsButton).toHaveAttribute('href', '/my-bookings');
    expect(screen.queryByTestId('auth-cta-logged-out')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('the wrong CTA does not display during authentication loading', async () => {
    authContext.useAuth.mockReturnValue({ user: null, loading: true });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

    const loadingPlaceholder = screen.getByTestId('auth-cta-loading');
    expect(loadingPlaceholder).toBeInTheDocument();
    expect(loadingPlaceholder).toHaveStyle({ visibility: 'hidden' });
    expect(screen.queryByTestId('auth-cta-logged-out')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auth-cta-authenticated')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('hero visual requirements: local WebP asset, no external image, accessible, elements remain rendered', async () => {
    authContext.useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

    const heroImage = screen.getByTestId('hero-image');
    expect(heroImage).toBeInTheDocument();

    // the hero uses the expected local WebP asset
    expect(heroImage).toHaveAttribute('src', '/images/hotels/marino-beach-demo/marino-beach-demo-main.webp');

    // no external image URL is used by the hero
    expect(heroImage.getAttribute('src')).not.toMatch(/^https?:\/\//);

    // the hero visual is decorative and accessible if represented as an image element
    expect(heroImage).toHaveAttribute('alt', '');
    expect(heroImage).toHaveAttribute('aria-hidden', 'true');

    // the hero heading, search controls and main CTA remain rendered
    expect(screen.getByText(/Your Perfect Stay/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Where to\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore All Hotels/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('destination cards use local WebP assets, have alt text, lazy loading, and labels render', async () => {
    authContext.useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );

    const destinations = [
      { city: 'Colombo', desc: 'The vibrant capital', alt: 'Colombo skyline, Sri Lanka', src: '/images/destinations/colombo.webp' },
      { city: 'Kandy', desc: 'Temple of the Sacred Tooth', alt: 'Kandy, Sri Lanka', src: '/images/destinations/kandy.webp' },
      { city: 'Galle', desc: 'Colonial fort & beaches', alt: 'Galle fort, Sri Lanka', src: '/images/destinations/galle.webp' },
      { city: 'Ella', desc: 'Misty mountains & tea', alt: 'Nine Arches Bridge in Ella, Sri Lanka', src: '/images/destinations/ella.webp' },
      { city: 'Sigiriya', desc: 'Ancient rock fortress', alt: 'Sigiriya Rock fortress, Sri Lanka', src: '/images/destinations/sigiriya.webp' },
      { city: 'Bentota', desc: 'Tropical beach paradise', alt: 'Bentota beach, Sri Lanka', src: '/images/destinations/bentota.webp' }
    ];

    for (const dest of destinations) {
      // Label and description render
      expect(screen.getByText(dest.city)).toBeInTheDocument();
      expect(screen.getByText(dest.desc)).toBeInTheDocument();

      // Image renders with exact alt text
      const img = screen.getByAltText(dest.alt);
      expect(img).toBeInTheDocument();

      // Image uses exact local WebP path
      expect(img).toHaveAttribute('src', dest.src);

      // No external URLs
      expect(img.getAttribute('src')).not.toMatch(/^https?:\/\//);

      // Lazy loading and async decoding
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');

      // Local fallback behavior exists (behavioral test)
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', '/images/default-hotel.svg');
    }

    // Home search remains rendered
    expect(screen.getByPlaceholderText(/Where to\?/i)).toBeInTheDocument();

    // Featured Properties remains rendered
    expect(screen.getByText(/Featured Properties/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
