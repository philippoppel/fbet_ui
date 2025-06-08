import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import LoginPage from './page';

const mockLogin = vi.fn(async () => true);
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: mockLogin,
  }),
}));

describe('LoginPage', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', async () => {
    render(<LoginPage />);
    expect(await screen.findByPlaceholderText('name@example.com')).toBeTruthy();
    expect(await screen.findByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Anmelden/i })[0]).toBeTruthy();
  });

  it.skip('toggles password visibility', async () => {
    // TODO: Passwort-Visibility in Tests zuverlässig prüfen
    const { container } = render(<LoginPage />);
    const pwInput = (await screen.findAllByPlaceholderText('••••••••'))[0] as HTMLInputElement;
    const toggleBtn = container.querySelectorAll('button[tabindex="-1"]')[0] as HTMLElement;
    const user = userEvent.setup();
    expect(pwInput.type).toBe('password');
    await user.click(toggleBtn);
    expect(pwInput.type).toBe('text');
    await user.click(toggleBtn);
    expect(pwInput.type).toBe('password');
  });

  it('calls login with credentials', async () => {
    render(<LoginPage />);
    const emailInput = (await screen.findAllByPlaceholderText('name@example.com'))[0];
    const passwordInput = (await screen.findAllByPlaceholderText('••••••••'))[0];
    fireEvent.change(emailInput, {
      target: { value: 'a@example.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Anmelden/i })[0]);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@example.com', 'secret'));
    expect(mockReplace).toHaveBeenCalled();
  });
});
