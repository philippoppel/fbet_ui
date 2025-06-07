import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const mockUseAuth = vi.fn()
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: (...args: any) => mockUseAuth(...args),
}))

const mockUseDashboardData = vi.fn()
vi.mock('@/app/hooks/useDashboardData', () => ({
  useDashboardData: (...args: any) => mockUseDashboardData(...args),
}))

vi.mock('@/app/hooks/useGroupInteractions', () => ({ useGroupInteractions: () => ({}) }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/app/components/layout/AppHeader', () => ({ AppHeader: ({ children }: any) => <div data-testid="app-header">{children}</div> }))
vi.mock('@/app/components/dashboard/DashboardLayout', () => ({ DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div> }))
vi.mock('@/app/components/dashboard/GroupDetailsSection', () => ({ GroupDetailsSection: () => <div data-testid="group-details-section" /> }))
vi.mock('@/app/components/dashboard/NoGroupsCard', () => ({ NoGroupsCard: () => <div data-testid="no-groups-card">No Groups</div> }))

import DashboardPage from './page'

function dashboardData(overrides: any = {}) {
  return {
    myGroups: [],
    retrievedCombinedEvents: [],
    selectedGroupId: null,
    selectedGroupDetails: null,
    selectedGroupEvents: [],
    setSelectedGroupEvents: vi.fn(),
    selectedGroupHighscore: [],
    selectedGroupMembers: [],
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
  }
}

const user = { id: 1, name: 'User' }

afterEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
  it('zeigt initialen Ladezustand während Auth-Ladevorgang', () => {
    mockUseAuth.mockReturnValue({ user: null, token: null, isLoading: true, logout: vi.fn() })
    mockUseDashboardData.mockReturnValue(dashboardData())

    render(<DashboardPage />)
    expect(screen.getByTestId('initial-loading-div')).toBeInTheDocument()
  })

  it('zeigt Login-Aufforderung wenn nicht eingeloggt', async () => {
    mockUseAuth.mockReturnValue({ user: null, token: null, isLoading: false, logout: vi.fn() })
    mockUseDashboardData.mockReturnValue(dashboardData())

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('login-prompt-div')).toBeInTheDocument()
    })
  })

  it('zeigt Ladeanzeige für Dashboard-Daten', async () => {
    mockUseAuth.mockReturnValue({ user, token: 't', isLoading: false, logout: vi.fn() })
    mockUseDashboardData.mockReturnValue(dashboardData({ loadingInitial: true }))

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-data-loading-div')).toBeInTheDocument()
    })
  })

  it('zeigt Hinweis wenn keine Gruppen existieren', async () => {
    mockUseAuth.mockReturnValue({ user, token: 't', isLoading: false, logout: vi.fn() })
    mockUseDashboardData.mockReturnValue(dashboardData())

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('no-groups-card')).toBeInTheDocument()
    })
  })

  it('zeigt Gruppendetails bei ausgewählter Gruppe', async () => {
    const group = { id: 1, name: 'Test', creator: { id: 2, name: 'c' } }
    mockUseAuth.mockReturnValue({ user, token: 't', isLoading: false, logout: vi.fn() })
    mockUseDashboardData.mockReturnValue(
      dashboardData({ myGroups: [group], selectedGroupId: 1, selectedGroupDetails: group })
    )

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('group-details-section')).toBeInTheDocument()
    })
  })
})

