import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ token: null, user: null, isLoading: false })
}));
vi.mock('@/app/lib/api', () => ({
  getMyGroups: vi.fn(),
}));

const { useDashboardData } = await import('./useDashboardData');

describe('useDashboardData', () => {
  it('initializes with empty groups when not authenticated', async () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.myGroups).toEqual([]);
    expect(result.current.selectedGroupId).toBe(null);
  });
});
