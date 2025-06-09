import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/components/dashboard/HighscoreCard', () => ({
  HighscoreCard: ({ highscore, isLoading }: any) => (
    <div data-testid='highscore-card'>
      {isLoading ? 'loading' : highscore.length}
    </div>
  ),
}));

beforeAll(() => {
  // Ensure React is available globally for classic runtime JSX
  // @ts-ignore
  globalThis.React = React;
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

const baseProps = {
  myGroups: [] as any[],
  selectedGroupId: null as number | null,
  selectedGroupDetails: null as any,
  selectedGroupHighscore: [] as any[],
  selectedGroupMembers: [] as any[],
  isGroupDataLoading: false,
  loadingInitial: false,
  errors: {} as any,
  isDesktopSidebarCollapsed: false,
  onToggleCollapse: vi.fn(),
  onSelectGroup: vi.fn(),
  currentUserId: 1,
  onDeleteGroupFromPage: vi.fn(async () => {}),
};

describe('DashboardLayout', () => {
  it('hides sidebar and highscore when user has no groups', () => {
    const { container } = render(
      <DashboardLayout {...baseProps}>
        <span>Child</span>
      </DashboardLayout>
    );
    expect(screen.getByText('Child')).toBeTruthy();
    expect(screen.queryByText('Gruppen')).toBeNull();
    expect(container.querySelector('#highscore-card')).toBeNull();
  });

  it('shows placeholder when group not selected', () => {
    const props = {
      ...baseProps,
      myGroups: [{ id: 1, name: 'Alpha', createdById: 1 }],
    };
    render(
      <DashboardLayout {...props}>
        <span>Child</span>
      </DashboardLayout>
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(
      screen.getByText(/Wähle links eine Gruppe aus,.*Rangliste zu sehen/i)
    ).toBeTruthy();
  });

  it('shows highscore card when group selected', () => {
    const props = {
      ...baseProps,
      myGroups: [{ id: 1, name: 'Alpha', createdById: 1 }],
      selectedGroupId: 1,
      selectedGroupHighscore: [{ user_id: 1, name: 'U', points: 5 }],
      selectedGroupMembers: [{ id: 1, name: 'U' }],
    };
    render(
      <DashboardLayout {...props}>
        <span>Child</span>
      </DashboardLayout>
    );
    expect(screen.getByTestId('highscore-card').textContent).toBe('1');
  });

  it('shows error message when group data error', () => {
    const props = {
      ...baseProps,
      myGroups: [{ id: 1, name: 'Alpha', createdById: 1 }],
      selectedGroupId: 1,
      errors: { groupData: 'fail' },
    };
    render(
      <DashboardLayout {...props}>
        <span>Child</span>
      </DashboardLayout>
    );
    expect(
      screen.getByText(/Rangliste konnte nicht geladen werden/i)
    ).toBeTruthy();
  });

  it('applies collapsed sidebar classes when collapsed', () => {
    const props = {
      ...baseProps,
      myGroups: [{ id: 1, name: 'Alpha', createdById: 1 }],
      isDesktopSidebarCollapsed: true,
    };
    const { container } = render(
      <DashboardLayout {...props}>
        <span>Child</span>
      </DashboardLayout>
    );
    const sidebarContainer = container.querySelector('div.fixed');
    expect(sidebarContainer?.className).toContain('lg:w-[72px]');
  });
});
