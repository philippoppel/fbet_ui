// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { DashboardLayout } from './DashboardLayout';

vi.mock('@/app/components/dashboard/GroupSidebar', () => ({
  GroupSidebar: (props: any) => (
    <div data-testid="group-sidebar">{props.isCollapsed ? 'collapsed' : 'expanded'}</div>
  ),
}));

vi.mock('@/app/components/dashboard/HighscoreCard', () => ({
  HighscoreCard: () => <div data-testid="highscore-card">HighscoreCard</div>,
}));

vi.mock('./HighscorePlaceholder', () => ({
  HighscorePlaceholder: () => (
    <div data-testid="highscore-placeholder">Placeholder</div>
  ),
}));

const sampleGroup = {
  id: 1,
  name: 'Group 1',
  creator: { id: 1, name: 'creator' },
} as any;

const baseProps = {
  children: <div>content</div>,
  myGroups: [sampleGroup],
  selectedGroupId: null,
  selectedGroupDetails: null,
  selectedGroupHighscore: [],
  selectedGroupMembers: [],
  isGroupDataLoading: false,
  loadingInitial: false,
  errors: {},
  isDesktopSidebarCollapsed: false,
  onToggleCollapse: vi.fn(),
  onSelectGroup: vi.fn(),
  currentUserId: 1,
  onDeleteGroupFromPage: vi.fn(),
};

const renderLayout = (overrides: Partial<typeof baseProps> = {}) =>
  render(<DashboardLayout {...baseProps} {...overrides} />);

describe('DashboardLayout', () => {
  it('toggles sidebar rendering and collapse class', () => {
    const { rerender } = renderLayout();
    const sidebar = screen.getByTestId('group-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.parentElement).toHaveClass('xl:w-80');

    rerender(<DashboardLayout {...baseProps} isDesktopSidebarCollapsed />);
    const collapsedSidebar = screen.getByTestId('group-sidebar');
    expect(collapsedSidebar.parentElement).toHaveClass('lg:w-[72px]');

    rerender(<DashboardLayout {...baseProps} myGroups={[]} />);
    expect(screen.queryByTestId('group-sidebar')).not.toBeInTheDocument();
  });

  it('shows HighscoreCard when group selected and no error', () => {
    renderLayout({ selectedGroupId: 1 });
    expect(screen.getByTestId('highscore-card')).toBeInTheDocument();
  });

  it('shows error card when groupData error exists', () => {
    renderLayout({ selectedGroupId: 1, errors: { groupData: 'fail' } });
    expect(
      screen.getByText(/Rangliste konnte nicht geladen werden\./)
    ).toBeInTheDocument();
  });

  it('shows HighscorePlaceholder when no group selected', () => {
    renderLayout({ selectedGroupId: null });
    expect(screen.getByTestId('highscore-placeholder')).toBeInTheDocument();
  });
});

