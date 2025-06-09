import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { EventList } from '@/app/components/dashboard/EventList';

const sampleEvent = {
  id: '1',
  title: 'Sample Event',
  subtitle: 'Main event',
  sport: 'ufc',
  date: new Date(),
  original: { summary: null, location: null, description: null, uid: null, dtstart: null, dtend: null },
};

describe('EventList', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows fallback when empty', () => {
    render(<EventList events={[]} onProposeEvent={vi.fn()} disabled={false} />);
    expect(screen.getByText('Keine bevorstehenden Events gefunden.')).toBeTruthy();
  });

  it('renders events and handles click', async () => {
    const onPropose = vi.fn();
    render(<EventList events={[sampleEvent]} onProposeEvent={onPropose} disabled={false} />);
    expect(screen.getByText('Sample Event')).toBeTruthy();
    const btn = screen.getByRole('button', { name: /wette hinzufügen/i });
    await userEvent.setup().click(btn);
    expect(onPropose).toHaveBeenCalledWith('1');
  });

  it('disables buttons when disabled', () => {
    const onPropose = vi.fn();
    render(<EventList events={[sampleEvent]} onProposeEvent={onPropose} disabled={true} />);
    const btn = screen.getByRole('button', { name: /wette hinzufügen/i });
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });
});
