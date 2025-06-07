import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { GroupDetailsSection } from './GroupDetailsSection';

// Mock child components to avoid complex implementations
vi.mock('./SelectedGroupView', () => ({
  SelectedGroupView: () => <div data-testid="selected-group-view" />,
}));

vi.mock('@/app/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Icons can be simple stubs
vi.mock('lucide-react', () => ({
  Users: () => <svg data-testid="users-icon" />,
  TriangleAlert: () => <svg data-testid="triangle-icon" />,
}));

// Helper data
const baseProps = {
  selectedGroupId: null as number | null,
  selectedGroupDetails: null,
  selectedGroupEvents: [],
  userSubmittedTips: {},
  allTipsPerEvent: {},
  highscoreEntries: null,
  user: { id: 1, name: 'Test' } as any,
  isGroupDataLoading: false,
  groupDataError: null,
  interactions: {} as any,
  onDeleteGroupInPage: vi.fn(),
  onImageChanged: vi.fn(),
};

describe('GroupDetailsSection', () => {
  it('shows placeholder when no group is selected', () => {
    render(<GroupDetailsSection {...baseProps} />);

    expect(
      screen.getByText(/Bitte wähle links eine Gruppe aus/i)
    ).toBeInTheDocument();
  });

  it('renders skeleton while loading', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        isGroupDataLoading={true}
      />
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders skeleton when id is set but details missing', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        selectedGroupId={5}
        selectedGroupDetails={null}
      />
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('displays error message when groupDataError present', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        selectedGroupId={2}
        selectedGroupDetails={null}
        groupDataError="Something went wrong"
      />
    );

    expect(
      screen.getByText(/Fehler beim Laden der Gruppe/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('renders SelectedGroupView with valid group', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        selectedGroupId={1}
        selectedGroupDetails={{ id: 1 } as any}
      />
    );

    expect(screen.getByTestId('selected-group-view')).toBeInTheDocument();
  });
});

