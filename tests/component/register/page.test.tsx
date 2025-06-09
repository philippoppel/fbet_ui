import {
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import RegisterPage from '@/app/register/page';

/* ------------------ Mocks ------------------ */
var mockRegisterUser: any;
const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/lib/api', () => {
  mockRegisterUser = vi.fn(async () => ({}));
  return {
    registerUser: mockRegisterUser,
    ApiError: class ApiError extends Error {},
  };
});

/* ------------------ Tests ------------------ */
describe('RegisterPage', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders registration form fields', async () => {
    render(<RegisterPage />);
    expect(await screen.findByPlaceholderText('Dein Name')).toBeTruthy();
    expect(await screen.findByPlaceholderText('deine@email.de')).toBeTruthy();
    expect(await screen.findAllByPlaceholderText('********')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /Konto erstellen/i })
    ).toBeTruthy();
  });

  it('submits data and redirects to login', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('Dein Name'), 'Max');
    await user.type(
      screen.getByPlaceholderText('deine@email.de'),
      'max@example.com'
    );
    const passwords = screen.getAllByPlaceholderText('********');
    await user.type(passwords[0], 'secretpass');
    await user.type(passwords[1], 'secretpass');

    await user.click(screen.getByRole('button', { name: /Konto erstellen/i }));

    await waitFor(() =>
      expect(mockRegisterUser).toHaveBeenCalledWith({
        email: 'max@example.com',
        name: 'Max',
        password: 'secretpass',
      })
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('shows error when passwords mismatch', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('Dein Name'), 'Max');
    await user.type(screen.getByPlaceholderText('deine@email.de'), 'max@example.com');
    const passwords = screen.getAllByPlaceholderText('********');
    await user.type(passwords[0], 'secretpass');
    await user.type(passwords[1], 'different');

    await user.click(screen.getByRole('button', { name: /Konto erstellen/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwörter stimmen nicht überein.')).toBeTruthy();
    });
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  it('passes redirect param to login page', async () => {
    mockGet.mockReturnValue('foo');
    render(<RegisterPage />);
    const loginLink = screen.getByRole('link', { name: /Zum Login/i });
    expect(loginLink.getAttribute('href')).toBe('/login?redirect=foo');
  });
});
