import { getRoomsByHotel } from './roomService';
import api from '../api/axios';
import { vi, describe, test, expect, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn()
  }
}));

describe('roomService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('hotel_id is included and undefined/null/empty parameters are omitted', async () => {
    api.get.mockResolvedValue({ data: [] });
    await getRoomsByHotel('30001', { check_in: undefined, check_out: null, guests: '', room_type: 'deluxe' });
    expect(api.get).toHaveBeenCalledWith('/rooms?hotel_id=30001&room_type=deluxe');
  });

  test('Valid search dates and guests are preserved', async () => {
    api.get.mockResolvedValue({ data: [] });
    await getRoomsByHotel('30001', { check_in: '2023-10-01', check_out: '2023-10-05', guests: '2' });
    expect(api.get).toHaveBeenCalledWith('/rooms?hotel_id=30001&check_in=2023-10-01&check_out=2023-10-05&guests=2');
  });
});
