import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import DashboardPage from './page';

let authMock: any;
let dashboardDataMock: any;
let groupInteractionsMock: any;
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => authMock,
}));

vi.mock('@/app/hooks/useDashboardData', () => ({
  useDashboardData: () => dashboardDataMock,
}));

vi.mock('@/app/hooks/useGroupInteractions', () => ({
  useGroupInteractions: () => groupInteractionsMock,
}));

vi.mock('@/app/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/app/components/dashboard/GroupDetailsSection', () => ({
  GroupDetailsSection: ({ selectedGroupDetails }: any) => (
    <div data-testid='group-details'>{selectedGroupDetails?.name}</div>
  ),
}));

function createDashboardData(overrides: Partial<any> = {}): any {
  return {
    myGroups: [],
    retrievedCombinedEvents: [],
    selectedGroupId: null,
    selectedGroupDetails: null,
    selectedGroupEvents: [],
    selectedGroupHighscore: [],
    selectedGroupMembers: [],
    setSelectedGroupEvents: vi.fn(),
    userSubmittedTips: {},
    allTipsPerEvent: {},
    loadingInitial: false,
    isGroupDataLoading: false,
    isLoadingCombinedEvents: false,
    errors: {},
    handleSelectGroup: vi.fn(),
    refreshSelectedGroupData: vi.fn(),
    updateUserTipState: vi.fn(),
    loadCombinedEvents: vi.fn(),
    refreshMyGroups: vi.fn(),
    ...overrides,
  };
}

function createInteractions(): any {
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
  };
}

/* ------------------ Tests ------------------ */
describe('DashboardPage', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows login prompt when unauthenticated', async () => {
    authMock = { user: null, token: null, isLoading: false, logout: vi.fn() };
    dashboardDataMock = createDashboardData();
    groupInteractionsMock = createInteractions();

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('login-prompt-div')).toBeTruthy();
    });
  });

  it('shows no groups card when user has no groups', async () => {
    authMock = { user: { id: 1 }, token: 't', isLoading: false, logout: vi.fn() };
    dashboardDataMock = createDashboardData();
    groupInteractionsMock = createInteractions();

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Willkommen bei fbet/i)).toBeTruthy();
    });
  });

  it('prompts to select a group when none is selected', async () => {
    authMock = { user: { id: 1 }, token: 't', isLoading: false, logout: vi.fn() };
    dashboardDataMock = createDashboardData({
      myGroups: [{ id: 1, name: 'G1', createdById: 1 }],
      selectedGroupId: null,
    });
    groupInteractionsMock = createInteractions();

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Wähle eine Gruppe aus\./i)).toBeTruthy();
    });
  });

  it('renders group details when a group is selected', async () => {
    authMock = {
      user: { id: 1, name: 'U' },
      token: 't',
      isLoading: false,
      logout: vi.fn(),
    };
    dashboardDataMock = createDashboardData({
      myGroups: [{ id: 1, name: 'G1', createdById: 1 }],
      selectedGroupId: 1,
      selectedGroupDetails: { id: 1, name: 'G1', createdById: 1 } as any,
    });
    groupInteractionsMock = createInteractions();

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('G1')).toBeTruthy();
    });
  });
});

