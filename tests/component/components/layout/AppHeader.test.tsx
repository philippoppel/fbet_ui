import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { AppHeader } from '@/app/components/layout/AppHeader';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/hooks/useAppRefresh', () => ({
  useAppRefresh: () => ({
    refresh: vi.fn(),
    updateAvailable: false,
    online: true,
    isRefreshing: false,
  }),
}));

vi.mock('@/app/hooks/usePushNotifications', () => ({
  PushNotificationStatus: { NOT_SUPPORTED: 'not_supported' },
  usePushNotifications: () => ({
    status: 'not_supported',
    error: null,
    requestPermissionAndSubscribe: vi.fn(),
    unsubscribeUser: vi.fn(),
    isSubscribed: false,
    isLoading: false,
    permissionDenied: false,
  }),
}));

describe('AppHeader', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows login and register links when not authenticated', () => {
    render(<AppHeader user={null} />);
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.getByText('Registrieren')).toBeTruthy();
    expect(screen.queryByText(/Hi,/)).toBeNull();
  });

  it('shows user greeting and logout button when authenticated', () => {
    const onLogout = vi.fn();
    render(
      <AppHeader
        user={{ id: 1, email: 'john@example.com', name: 'John Doe' }}
        onLogout={onLogout}
        myGroups={[]}
      />
    );
    expect(screen.getByText('Hi, John!')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeTruthy();
    expect(screen.queryByText('Login')).toBeNull();
  });
});
