import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import LoginPage from './page';

/* ------------------ Mocks ------------------ */
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

/* ------------------ Tests ------------------ */
describe('LoginPage', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders email and password fields', async () => {
    render(<LoginPage />);
    expect(await screen.findByPlaceholderText('name@example.com')).toBeTruthy();
    expect(await screen.findByPlaceholderText('••••••••')).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: /Anmelden/i })[0]
    ).toBeTruthy();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const pwInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;

    // Sicherer: über den Button im selben Container selektieren
    const toggleBtn = pwInput.closest('div')!.querySelector('button')!;

    // Initialer Zustand
    expect(pwInput.type).toBe('password');

    // Toggle 1 → sichtbar
    await user.click(toggleBtn);
    await waitFor(() => {
      expect(pwInput.type).toBe('text');
    });

    // Toggle 2 → wieder versteckt
    await user.click(toggleBtn);
    await waitFor(() => {
      expect(pwInput.type).toBe('password');
    });
  });

  it('calls login with credentials and redirects', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const loginBtn = screen.getAllByRole('button', { name: /Anmelden/i })[0];

    await user.type(emailInput, 'a@example.com');
    await user.type(passwordInput, 'secret');

    // PWA Event Spy
    const pwaSpy = vi.fn();
    window.addEventListener('successfulLoginForPwaPrompt', pwaSpy);

    // Submit
    await user.click(loginBtn);

    // Assertions
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('a@example.com', 'secret')
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(pwaSpy).toHaveBeenCalled();
    });
  });
});
