import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { SelectedGroupView } from '@/app/components/dashboard/SelectedGroupView';

const headerProps: any = {};
vi.mock('@/app/components/dashboard/GroupHeaderCard', () => ({
  GroupHeaderCard: (props: any) => {
    Object.assign(headerProps, props);
    return <div data-testid='header'>{props.leaderboardWinner?.name}</div>;
  },
}));

vi.mock('@/app/components/dashboard/OpenEventsCard', () => ({
  default: () => <div data-testid='open-events' />,
}));
vi.mock('@/app/components/dashboard/SubmittedOpenEventsCard', () => ({
  default: () => <div data-testid='submitted-open-events' />,
}));
vi.mock('@/app/components/dashboard/ClosedEventsCard', () => ({
  default: () => <div data-testid='closed-events' />,
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

function createInteractions(overrides: Partial<any> = {}): any {
  return {
    selectedTips: {},
    wildcardInputs: {},
    resultInputs: {},
    isSubmittingTip: {},
    isSettingResult: {},
    isAddEventDialogOpen: false,
    eventToDelete: null,
    isDeletingSpecificEvent: false,
    addEventForm: {} as any,
    handleOptionSelect: vi.fn(),
    handleClearSelectedTip: vi.fn(),
    handleWildcardInputChange: vi.fn(),
    handleSubmitTip: vi.fn(),
    handleSetWildcardResult: vi.fn(),
    handleResultInputChange: vi.fn(),
    handleSetResult: vi.fn(),
    setIsAddEventDialogOpen: vi.fn(),
    handleAddEventSubmit: vi.fn(),
    handleInitiateDeleteEvent: vi.fn(),
    handleConfirmDeleteEvent: vi.fn(),
    resetDeleteEventDialog: vi.fn(),
    ...overrides,
  };
}

const baseProps = {
  group: { id: 1, name: 'G1', createdById: 1 } as any,
  events: [] as any[],
  user: { id: 1, name: 'U' } as any,
  userSubmittedTips: {},
  allTipsPerEvent: {},
  highscoreEntries: null as any,
  onDeleteGroup: vi.fn(),
  onImageChanged: vi.fn(),
};

describe('SelectedGroupView', () => {
  it('hides delete dialog when eventToDelete null', () => {
    const interactions = createInteractions();
    render(<SelectedGroupView {...baseProps} interactions={interactions} />);
    expect(screen.queryByText('Event wirklich löschen?')).toBeNull();
  });

  it('shows delete dialog and confirms delete', async () => {
    const onConfirm = vi.fn();
    const interactions = createInteractions({
      eventToDelete: { id: 5, title: 'E' } as any,
      handleConfirmDeleteEvent: onConfirm,
    });
    render(<SelectedGroupView {...baseProps} interactions={interactions} />);
    expect(screen.getByText('Event wirklich löschen?')).toBeTruthy();
    const btn = screen.getByRole('button', { name: /löschen/i });
    await userEvent.setup().click(btn);
    expect(onConfirm).toHaveBeenCalledWith(5);
  });

  it('passes leaderboard winner to header card', () => {
    const interactions = createInteractions();
    const highscore = [
      { user_id: 1, points: 3, name: 'A' },
      { user_id: 2, points: 3, name: 'B' },
    ];
    render(
      <SelectedGroupView
        {...baseProps}
        highscoreEntries={highscore as any}
        interactions={interactions}
      />
    );
    expect(headerProps.leaderboardWinner.name).toBe('A & B');
  });
});
