import { archiveHotel, unarchiveHotel } from './adminService';
import api from '../api/axios';
import { vi, describe, test, expect, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    put: vi.fn(),
    patch: vi.fn()
  }
}));

describe('adminService - Hotel Archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('archiveHotel(id) calls PUT /api/v1/hotels/:id with exactly { status: "inactive" }', async () => {
    api.put.mockResolvedValue({ data: { success: true } });
    const response = await archiveHotel(42);

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/hotels/42', { status: 'inactive' });
    expect(api.patch).not.toHaveBeenCalled();
    expect(response.data.success).toBe(true);
  });

  test('unarchiveHotel(id) calls PUT /api/v1/hotels/:id with exactly { status: "active" }', async () => {
    api.put.mockResolvedValue({ data: { success: true } });
    const response = await unarchiveHotel(42);

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/hotels/42', { status: 'active' });
    expect(api.patch).not.toHaveBeenCalled();
    expect(response.data.success).toBe(true);
  });

  test('API errors are propagated to the UI safely', async () => {
    const mockError = new Error('Network error');
    mockError.response = { data: { message: 'Invalid hotel ID' } };

    api.put.mockRejectedValue(mockError);

    await expect(archiveHotel(42)).rejects.toThrow('Network error');
    await expect(unarchiveHotel(42)).rejects.toThrow('Network error');
  });
});
