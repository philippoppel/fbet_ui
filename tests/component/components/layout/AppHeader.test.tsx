import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { AppHeader } from '@/app/components/layout/AppHeader';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const appRefreshMock = {
  refresh: vi.fn(),
  updateAvailable: false,
  online: true,
  isRefreshing: false,
};
vi.mock('@/app/hooks/useAppRefresh', () => ({
  useAppRefresh: () => appRefreshMock,
}));

let pushMock: any = {
  status: 'not_supported',
  error: null,
  requestPermissionAndSubscribe: vi.fn(),
  unsubscribeUser: vi.fn(),
  isSubscribed: false,
  isLoading: false,
  permissionDenied: false,
};
vi.mock('@/app/hooks/usePushNotifications', () => ({
  PushNotificationStatus: {
    NOT_SUPPORTED: 'not_supported',
    SUPPORTED_NOT_SUBSCRIBED: 'supported_not_subscribed',
  },
  usePushNotifications: () => pushMock,
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

  it('shows loader when refresh button clicked', async () => {
    appRefreshMock.refresh = vi.fn();
    appRefreshMock.updateAvailable = true;
    const { container } = render(<AppHeader user={null} />);
    const btn = await screen.findByLabelText('App neu laden');
    await userEvent.setup().click(btn);
    expect(appRefreshMock.refresh).toHaveBeenCalled();
    expect(container.querySelector('.backdrop-blur-sm')).toBeTruthy();
  });

  it('toggles push notifications when button clicked', async () => {
    pushMock = {
      status: 'supported_not_subscribed',
      error: null,
      requestPermissionAndSubscribe: vi.fn(async () => true),
      unsubscribeUser: vi.fn(),
      isSubscribed: false,
      isLoading: false,
      permissionDenied: false,
    };
    render(
      <AppHeader user={{ id: 1, email: 'a@example.com', name: 'A' }} myGroups={[]} />
    );
    const btn = await screen.findByLabelText('Push-Benachrichtigungen aktivieren');
    await userEvent.setup().click(btn);
    expect(pushMock.requestPermissionAndSubscribe).toHaveBeenCalled();
  });
});
