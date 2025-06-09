import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ token: null, user: null, isLoading: false })
}));
vi.mock('@/app/lib/api', () => ({
  getMyGroups: vi.fn(),
}));

const { useDashboardData } = await import('@/app/hooks/useDashboardData');

describe('useDashboardData', () => {
  it('initializes with empty groups when not authenticated', async () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.myGroups).toEqual([]);
    expect(result.current.selectedGroupId).toBe(null);
  });

  it('updates userSubmittedTips when updateUserTipState is called', async () => {
    const { result } = renderHook(() => useDashboardData());
    await act(async () => {
      result.current.updateUserTipState(1, 'A');
    });
    expect(result.current.userSubmittedTips).toEqual({ 1: 'A' });
  });

  it('handles selecting a group and persists id to localStorage', async () => {
    const { result } = renderHook(() => useDashboardData());
    await act(async () => {
      result.current.handleSelectGroup(3);
    });
    expect(result.current.selectedGroupId).toBe(3);
    expect(localStorage.getItem('selectedGroupId')).toBe('3');
  });
});
