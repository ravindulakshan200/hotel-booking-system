import { test, expect } from 'vitest';
import { formatAddress } from './formatters';

test('full address already containing city and country', () => {
  expect(formatAddress('No. 590, Marine Drive, Colombo 03, Sri Lanka', 'Colombo 03')).toBe('No. 590, Marine Drive, Colombo 03, Sri Lanka');
});

test('case-insensitive duplicates', () => {
  expect(formatAddress('No. 590, colombo, sri lanka', 'Colombo')).toBe('No. 590, colombo, sri lanka');
});

test('partial address', () => {
  expect(formatAddress('No. 590, Marine Drive', 'Colombo')).toBe('No. 590, Marine Drive, Colombo, Sri Lanka');
});

test('missing address', () => {
  expect(formatAddress('', 'Colombo')).toBe('Colombo, Sri Lanka');
});

test('missing city', () => {
  expect(formatAddress('No. 590, Marine Drive', '')).toBe('No. 590, Marine Drive, Sri Lanka');
});

test('missing country', () => {
  expect(formatAddress('No. 590, Marine Drive', 'Colombo', '')).toBe('No. 590, Marine Drive, Colombo');
});

test('no accidental removal of legitimate address text', () => {
  expect(formatAddress('Colombo Street, 123', 'Galle')).toBe('Colombo Street, 123, Galle, Sri Lanka');
});
