import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroupSidebar } from './GroupSidebar';
import type { Group } from '@/app/lib/types';

const makeGroup = (id: number, name: string): Group => ({
  id,
  name,
  creator: { id: 1, name: 'User' },
} as unknown as Group);

const groups: Group[] = [
  makeGroup(1, 'Group 1'),
  makeGroup(2, 'Group 2'),
  makeGroup(3, 'Group 3'),
];

const baseProps = {
  groups,
  selectedGroupId: null as number | null,
  onSelectGroup: vi.fn(),
  isLoading: false,
  error: null as string | null,
  currentUserId: null,
  onDeleteGroup: vi.fn(),
};

describe('GroupSidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    (baseProps.onSelectGroup as any).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays loading spinner when isLoading is true', () => {
    render(<GroupSidebar {...baseProps} isLoading={true} />);
    expect(screen.getByText('Gruppen laden…')).not.toBeNull();
  });

  it('renders error message when error prop is provided', () => {
    render(<GroupSidebar {...baseProps} error="Boom" />);
    expect(screen.getByText('Fehler:')).not.toBeNull();
    expect(screen.getByText('Boom')).not.toBeNull();
  });

  it('shows favorite first and highlights selected group', () => {
    localStorage.setItem('favoriteGroupId', '2');
    const { container } = render(
      <GroupSidebar {...baseProps} selectedGroupId={2} />
    );
    const buttons = container.querySelectorAll('[data-testid^="group-btn-"]');
    expect(buttons[0].getAttribute('data-testid')).toBe('group-btn-2');
    expect(buttons[0].className.includes('bg-primary')).toBe(true);
  });

  it('calls onSelectGroup when group button clicked', () => {
    const onSelectGroup = vi.fn();
    render(<GroupSidebar {...baseProps} onSelectGroup={onSelectGroup} />);
    fireEvent.click(screen.getByTestId('group-btn-1'));
    expect(onSelectGroup).toHaveBeenCalledWith(1);
  });
});
