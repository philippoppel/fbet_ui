import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { GroupSidebar } from './GroupSidebar';
import type { Group } from '@/app/lib/types';

describe('GroupSidebar', () => {
  const groups: Group[] = [
    { id: 1, name: 'Alpha' } as unknown as Group,
    { id: 2, name: 'Beta' } as unknown as Group,
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('zeigt bei isLoading einen Spinner', () => {
    render(
      <GroupSidebar
        groups={groups}
        selectedGroupId={1}
        onSelectGroup={vi.fn()}
        isLoading={true}
        error={null}
        currentUserId={1}
        onDeleteGroup={vi.fn()}
      />,
    );
    expect(screen.getByText('Gruppen laden…')).toBeInTheDocument();
  });

  it('zeigt einen Fehlertext an', () => {
    render(
      <GroupSidebar
        groups={groups}
        selectedGroupId={1}
        onSelectGroup={vi.fn()}
        isLoading={false}
        error="Ein Fehler"
        currentUserId={1}
        onDeleteGroup={vi.fn()}
      />,
    );
    expect(screen.getByText('Fehler:')).toBeInTheDocument();
    expect(screen.getByText('Ein Fehler')).toBeInTheDocument();
  });

  it('listet die Favoriten zuerst und markiert die ausgewählte Gruppe', async () => {
    localStorage.setItem('favoriteGroupId', '2');
    const onSelectGroup = vi.fn();
    render(
      <GroupSidebar
        groups={groups}
        selectedGroupId={1}
        onSelectGroup={onSelectGroup}
        isLoading={false}
        error={null}
        currentUserId={1}
        onDeleteGroup={vi.fn()}
      />,
    );

    // wait for effect reading favoriteGroupId
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /alpha|beta/i })).toHaveLength(2);
    });

    const buttons = screen.getAllByRole('button', { name: /alpha|beta/i });
    expect(buttons[0]).toHaveTextContent('Beta');
    expect(buttons[1]).toHaveTextContent('Alpha');

    const selectedButton = screen.getByTestId('group-btn-1');
    expect(selectedButton.className).toMatch(/bg-primary/);

    fireEvent.click(screen.getByTestId('group-btn-2'));
    expect(onSelectGroup).toHaveBeenCalledWith(2);
  });
});
