import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ImageCredits from './ImageCredits';
import Footer from '../components/Footer';

describe('Image Credits and Footer', () => {
  test('Image Credits page renders all six authors, source links, and licenses', () => {
    render(
      <MemoryRouter>
        <ImageCredits />
      </MemoryRouter>
    );

    // Check all authors
    expect(screen.getByText('Praveenshashika')).toBeInTheDocument();
    expect(screen.getByText('DilanC lw')).toBeInTheDocument();
    expect(screen.getByText('Diwyanjalee Wanigasekara')).toBeInTheDocument();
    expect(screen.getByText('Knthabrew')).toBeInTheDocument();
    expect(screen.getByText('Chamixth')).toBeInTheDocument();
    expect(screen.getByText('Vincent van Zeijst')).toBeInTheDocument();

    // Check licenses
    expect(screen.getAllByText('CC BY-SA 4.0').length).toBe(5);
    expect(screen.getAllByText('CC BY-SA 3.0').length).toBe(1);

    // Check source links
    const sourceLinks = [
      'https://commons.wikimedia.org/wiki/File:Beautiful_Sunrise_over_the_Colombo_Skyline_as_seen_from_the_ocean.jpg',
      'https://commons.wikimedia.org/wiki/File:Kandy,_Sri_Lanka.jpg',
      'https://commons.wikimedia.org/wiki/File:Galle_fort_sri_lanka.jpg',
      'https://commons.wikimedia.org/wiki/File:Nine_Arches_Bridge_in_Ella.jpg',
      'https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg',
      'https://commons.wikimedia.org/wiki/File:Sri_Lanka,_Bentota,_beach_(2).JPG'
    ];

    const links = screen.getAllByRole('link', { name: /Wikimedia Commons/i });
    expect(links.length).toBe(6);
        // Check that each expected source link exists in the set of rendered links
      for (const expectedLink of sourceLinks) {
        const match = links.find(l => l.getAttribute('href') === expectedLink);
        expect(match).toBeInTheDocument();
        expect(match).toHaveAttribute('href', expectedLink);
        expect(expectedLink).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      }

    // Check license links
    const cc4 = screen.getAllByRole('link', { name: 'CC BY-SA 4.0' });
    expect(cc4.length).toBe(5);
    for (const link of cc4) {
      expect(link).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
    }

    const cc3 = screen.getByRole('link', { name: 'CC BY-SA 3.0' });
    expect(cc3).toBeInTheDocument();
    expect(cc3).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/3.0/');
  });

  test('Footer contains link to Image Credits page', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const creditsLink = screen.getByRole('link', { name: /Image Credits/i });
    expect(creditsLink).toBeInTheDocument();
    expect(creditsLink).toHaveAttribute('href', '/image-credits');
  });
});
