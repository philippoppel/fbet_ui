import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { GroupSidebar } from './GroupSidebar';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('GroupSidebar', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
    localStorage.clear();
  });

  const baseProps = {
    groups: [] as any[],
    selectedGroupId: null as number | null,
    onSelectGroup: vi.fn(),
    isLoading: false,
    error: null as string | null,
    currentUserId: 1,
    onDeleteGroup: vi.fn(async () => {}),
  };

  it('renders provided group names', async () => {
    const props = {
      ...baseProps,
      groups: [
        { id: 1, name: 'Alpha' } as any,
        { id: 2, name: 'Beta' } as any,
      ],
    };

    render(<GroupSidebar {...props} />);

    expect(await screen.findByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('calls onSelectGroup when clicking a group', async () => {
    const onSelect = vi.fn();
    const props = {
      ...baseProps,
      groups: [
        { id: 1, name: 'Alpha' } as any,
        { id: 2, name: 'Beta' } as any,
      ],
      onSelectGroup: onSelect,
    };

    render(<GroupSidebar {...props} />);
    const btn = await screen.findByTestId('group-btn-2');
    await userEvent.setup().click(btn);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('stores favorite group id in localStorage when star is clicked', async () => {
    const props = {
      ...baseProps,
      groups: [{ id: 1, name: 'Alpha' } as any],
    };

    render(<GroupSidebar {...props} />);

    const starBtn = await screen.findByTitle('Als Favorit festlegen');
    await userEvent.setup().click(starBtn);
    await waitFor(() => {
      expect(localStorage.getItem('favoriteGroupId')).toBe('1');
    });
  });

  it('orders favorite group first', async () => {
    localStorage.setItem('favoriteGroupId', '2');
    const props = {
      ...baseProps,
      groups: [
        { id: 1, name: 'Alpha' } as any,
        { id: 2, name: 'Beta' } as any,
      ],
    };

    render(<GroupSidebar {...props} />);
    const buttons = await screen.findAllByTestId(/group-btn-/);
    expect(buttons[0].textContent).toContain('Beta');
  });

  it('hides create group link when collapsed', async () => {
    const props = {
      ...baseProps,
      isCollapsed: true,
    };

    render(<GroupSidebar {...props} />);
    expect(screen.queryByText('Neue Gruppe erstellen')).toBeNull();
  });

  it('shows loading message when isLoading', async () => {
    const props = {
      ...baseProps,
      isLoading: true,
    };

    render(<GroupSidebar {...props} />);
    expect(await screen.findByText('Gruppen laden…')).toBeTruthy();
  });
});
