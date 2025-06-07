// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

// mock child components
vi.mock('@/app/components/dashboard/OpenEventsCard', () => ({
  __esModule: true,
  default: ({ onSetResultAction }: any) => (
    <button data-testid="open-set-result" onClick={() => onSetResultAction(1, 'A')}>
      OpenEventsCard
    </button>
  ),
}), { virtual: true })

vi.mock('@/app/components/dashboard/GroupHeaderCard', () => ({
  __esModule: true,
  GroupHeaderCard: ({ leaderboardWinner, onDeleteGroup }: any) => (
    <div>
      {leaderboardWinner?.name && (
        <span>Spitzenreiter: {leaderboardWinner.name}</span>
      )}
      <button onClick={() => onDeleteGroup({})} aria-label="delete-group" />
    </div>
  ),
}), { virtual: true })

vi.mock('./SubmittedOpenEventsCard', () => ({
  __esModule: true,
  default: ({ onSetResultAction }: any) => (
    <button data-testid="submitted-set-result" onClick={() => onSetResultAction(2, 'B')}>
      SubmittedOpenEventsCard
    </button>
  ),
}), { virtual: true })

vi.mock('@/app/components/dashboard/ClosedEventsCard', () => ({
  __esModule: true,
  default: () => <div data-testid="closed-events" />,
}), { virtual: true })

import { SelectedGroupView } from './SelectedGroupView'
import type { Group, Event as GroupEvent, UserOut, HighscoreEntry } from '@/app/lib/types'
import type { UseGroupInteractionsReturn } from '@/app/hooks/useGroupInteractions'

describe('SelectedGroupView', () => {
  const baseGroup: Group = {
    id: 1,
    name: 'Test Group',
    description: null,
    imageUrl: null,
    inviteToken: null,
    createdAt: '',
    updatedAt: '',
    createdById: 1,
    creator: { id: 1, name: 'Creator', email: 'creator@example.com', isActive: true, createdAt: '', updatedAt: '' },
  } as unknown as Group

  const baseUser: UserOut = {
    id: 1,
    name: 'User',
    email: 'user@example.com',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  } as UserOut

  const baseInteractions: UseGroupInteractionsReturn = {
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
  }

  const renderComponent = (props?: Partial<{ highscoreEntries: HighscoreEntry[] }>) =>
    render(
      <SelectedGroupView
        group={baseGroup}
        events={[] as GroupEvent[]}
        user={baseUser}
        interactions={baseInteractions}
        userSubmittedTips={{}}
        allTipsPerEvent={{}}
        highscoreEntries={props?.highscoreEntries || null}
        onDeleteGroup={vi.fn()}
        onImageChanged={vi.fn()}
      />
    )

  it('zeigt den Gewinnernamen, wenn Highscore-Daten übergeben werden', () => {
    renderComponent({
      highscoreEntries: [
        { user_id: 1, name: 'Alice', points: 10 } as HighscoreEntry,
        { user_id: 2, name: 'Bob', points: 5 } as HighscoreEntry,
      ],
    })
    expect(screen.getByText(/Spitzenreiter: Alice/)).toBeInTheDocument()
  })

  it('löst Callbacks bei Interaktionen aus', async () => {
    const user = userEvent.setup()
    const onDeleteGroup = vi.fn()
    const interactions = { ...baseInteractions, handleSetResult: vi.fn() }

    render(
      <SelectedGroupView
        group={baseGroup}
        events={[] as GroupEvent[]}
        user={baseUser}
        interactions={interactions}
        userSubmittedTips={{}}
        allTipsPerEvent={{}}
        highscoreEntries={null}
        onDeleteGroup={onDeleteGroup}
        onImageChanged={vi.fn()}
      />
    )

    // trigger delete via mocked header
    await user.click(screen.getByLabelText('delete-group'))

    expect(onDeleteGroup).toHaveBeenCalled()

    // trigger set result from mocked component
    await user.click(screen.getByTestId('open-set-result'))
    expect(interactions.handleSetResult).toHaveBeenCalledWith(1, 'A')
  })
})
