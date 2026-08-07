import { getRoomsByHotel, getRoomAvailability } from './roomService';
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

  describe('getRoomAvailability', () => {
    test('valid JSON returns the normalized availability result', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { unavailable_dates: ['2023-10-01', '2023-10-02'] }
        }
      };
      api.get.mockResolvedValue(mockResponse);
      const res = await getRoomAvailability('101', '2023', '10');
      expect(res).toEqual(mockResponse);
    });

    test('HTTP 200 containing <!doctype html> rejects', async () => {
      api.get.mockResolvedValue({ data: '<!doctype html><html>...</html>' });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: expected JSON, got string/HTML');
    });

    test('success:false rejects', async () => {
      api.get.mockResolvedValue({
        data: { success: false, data: { unavailable_dates: [] } }
      });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: success is not true');
    });

    test('missing data rejects', async () => {
      api.get.mockResolvedValue({
        data: { success: true }
      });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: data is missing or not an object');
    });

    test('missing unavailable_dates rejects', async () => {
      api.get.mockResolvedValue({
        data: { success: true, data: {} }
      });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: unavailable_dates is missing or not an array');
    });

    test('invalid unavailable_dates type rejects', async () => {
      api.get.mockResolvedValue({
        data: { success: true, data: { unavailable_dates: "not an array" } }
      });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: unavailable_dates is missing or not an array');
    });

    test('invalid date entry schema rejects', async () => {
      api.get.mockResolvedValue({
        data: { success: true, data: { unavailable_dates: ['2023-10-01', 12345] } }
      });
      await expect(getRoomAvailability('101', '2023', '10')).rejects.toThrow('Invalid availability response: date entries have invalid schema');
    });
  });
});
