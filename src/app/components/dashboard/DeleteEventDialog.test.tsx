import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import DeleteEventDialog from './DeleteEventDialog';

const baseEvent = { id: 1, title: 'Test Event' } as any;

describe('DeleteEventDialog', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('does not render dialog when event is null', () => {
    render(<DeleteEventDialog event={null} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Event wirklich löschen?')).toBeNull();
  });

  it('calls onConfirm with event id when delete clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteEventDialog event={baseEvent} onClose={vi.fn()} onConfirm={onConfirm} />);
    const btn = screen.getByRole('button', { name: /löschen/i });
    await userEvent.setup().click(btn);
    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteEventDialog event={baseEvent} onClose={onClose} onConfirm={vi.fn()} />);
    const close = screen.getByLabelText('Close');
    await userEvent.setup().click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
