import '@testing-library/jest-dom';
import { render, screen, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardLayout } from './DashboardLayout';
import type { Group } from '@/app/lib/types';

vi.mock('@/app/components/dashboard/GroupSidebar', () => ({
  GroupSidebar: () => <div data-testid="group-sidebar" />,
}));

vi.mock('@/app/components/dashboard/HighscoreCard', () => ({
  HighscoreCard: () => <div data-testid="highscore-card" />,
}));

vi.mock('./HighscorePlaceholder', () => ({
  HighscorePlaceholder: () => <div data-testid="highscore-placeholder" />,
}));

const baseGroup = {
  id: 1,
  name: 'Group 1',
  createdById: 1,
  creator: { id: 1, name: 'User' },
} as unknown as Group;

const baseProps = {
  children: <div>Child</div>,
  myGroups: [baseGroup],
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
  currentUserId: null,
  onDeleteGroupFromPage: vi.fn(),
};

function renderLayout(overrides: Partial<typeof baseProps> = {}) {
  return render(<DashboardLayout {...baseProps} {...overrides} />);
}

afterEach(() => {
  cleanup();
});

describe('DashboardLayout', () => {
  it('blendet Sidebar aus, wenn keine Gruppen vorhanden sind', () => {
    renderLayout({ myGroups: [] });
    expect(screen.queryByTestId('group-sidebar')).not.toBeInTheDocument();
  });

  it('zeigt Sidebar mit passender Breitenklasse, wenn Gruppen vorhanden sind', () => {
    const { getByTestId, unmount } = renderLayout({ isDesktopSidebarCollapsed: false });
    const sidebar = getByTestId('group-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.parentElement?.className).toContain('xl:w-80');
    unmount();

    const { getByTestId: getCollapsed } = renderLayout({ isDesktopSidebarCollapsed: true });
    const collapsedSidebar = getCollapsed('group-sidebar');
    expect(collapsedSidebar.parentElement?.className).toContain('lg:w-[72px]');
  });

  it('rendert HighscoreCard bei ausgew\u00e4hlter Gruppe ohne Fehler', () => {
    renderLayout({ selectedGroupId: 1 });
    expect(screen.getByTestId('highscore-card')).toBeInTheDocument();
  });

  it('zeigt Fehlerkarte, wenn Fehler f\u00fcr Gruppendaten vorliegt', () => {
    renderLayout({ selectedGroupId: 1, errors: { groupData: 'oops' } });
    expect(
      screen.getByText('Rangliste konnte nicht geladen werden.')
    ).toBeInTheDocument();
  });

  it('rendert HighscorePlaceholder ohne ausgew\u00e4hlte Gruppe', () => {
    renderLayout({ selectedGroupId: null });
    expect(screen.getByTestId('highscore-placeholder')).toBeInTheDocument();
  });
});
