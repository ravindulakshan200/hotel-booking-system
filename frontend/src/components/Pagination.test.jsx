import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Pagination from './Pagination';

test('does not render when totalPages <= 1', () => {
  const { container } = render(
    <Pagination page={1} totalPages={1} onPageChange={() => {}} />
  );
  expect(container.firstChild).toBeNull();
});

test('renders pagination controls correctly', () => {
  const handlePageChange = vi.fn();
  render(
    <Pagination page={2} totalPages={5} onPageChange={handlePageChange} />
  );

  // Checks that buttons for pages exist
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();

  // Checks active page marker
  const activeBtn = screen.getByLabelText('Go to page 2');
  expect(activeBtn).toHaveAttribute('aria-current', 'page');
  expect(activeBtn).toHaveClass('bg-primary');

  // Clicks next/prev page buttons
  const nextBtn = screen.getByText(/Next/i);
  fireEvent.click(nextBtn);
  expect(handlePageChange).toHaveBeenCalledWith(3);

  const prevBtn = screen.getByText(/Prev/i);
  fireEvent.click(prevBtn);
  expect(handlePageChange).toHaveBeenCalledWith(1);
});

test('handles sliding window and ellipsis correctly', () => {
  const handlePageChange = vi.fn();
  render(
    <Pagination page={5} totalPages={10} onPageChange={handlePageChange} />
  );

  // For page 5 of 10, window is: 3, 4, 5, 6, 7.
  // First page 1 and last page 10 are also rendered outside the window.
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.queryByText('2')).toBeNull(); // page 2 should be collapsed to ellipsis
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('6')).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.queryByText('8')).toBeNull(); // page 8 collapsed
  expect(screen.queryByText('9')).toBeNull(); // page 9 collapsed
  expect(screen.getByText('10')).toBeInTheDocument();

  // Ellipsis text markers
  const ellipses = screen.getAllByText('...');
  expect(ellipses.length).toBe(2);
});
