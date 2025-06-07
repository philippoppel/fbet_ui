import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GroupDetailsSection } from './GroupDetailsSection';

vi.mock('@/app/components/dashboard/SelectedGroupView', () => ({
  SelectedGroupView: () => <div data-testid="selected-group-view" />,
}));

vi.mock('@/app/components/ui/card', () => ({
  Card: (props: any) => <div data-testid="card" {...props} />,
  CardHeader: (props: any) => <div {...props} />,
  CardContent: (props: any) => <div {...props} />,
}));

vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

describe('GroupDetailsSection', () => {
  const baseProps = {
    selectedGroupId: null as number | null,
    selectedGroupDetails: null as any,
    selectedGroupEvents: [] as any[],
    userSubmittedTips: {},
    allTipsPerEvent: {} as any,
    highscoreEntries: null,
    user: { id: 1 } as any,
    isGroupDataLoading: false,
    groupDataError: null as string | null | undefined,
    interactions: {} as any,
    onDeleteGroupInPage: vi.fn(),
    onImageChanged: vi.fn(),
  };

  it('zeigt Platzhalterkarte ohne selectedGroupId', () => {
    render(<GroupDetailsSection {...baseProps} />);
    expect(
      screen.getByText(/bitte wähle links eine gruppe/i)
    ).toBeInTheDocument();
  });

  it('rendert Skeleton bei Ladevorgang oder fehlenden Details', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        selectedGroupId={1}
        isGroupDataLoading={true}
      />
    );
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('zeigt Fehlerkarte bei groupDataError', () => {
    render(
      <GroupDetailsSection
        {...baseProps}
        selectedGroupId={1}
        groupDataError="Fehler"
      />
    );
    expect(
      screen.getByText(/fehler beim laden der gruppe/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Fehler')).toBeInTheDocument();
  });

  it('zeigt SelectedGroupView bei validen Details', () => {
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
