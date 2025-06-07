// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { EventList } from './EventList';
import type { MixedEvent } from '@/app/lib/types';
import '@testing-library/jest-dom/vitest';
(global as any).React = React;

vi.mock('@/app/components/event/EventCard', () => ({
  __esModule: true,
  EventCard: ({ title, subtitle, badge, onClick, onAiCreateClick }: any) => (
    <li>
      <span data-testid="badge">{badge}</span>
      <button data-testid={`select-${title}`} onClick={onClick}>select</button>
      {onAiCreateClick && (
        <button data-testid={`ai-${title}`} onClick={() => onAiCreateClick({ title, subtitle, badge })}>ai</button>
      )}
    </li>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EventList', () => {
  it('shows empty message when events list is empty', () => {
    render(<EventList events={[]} onProposeEvent={vi.fn()} disabled={false} />);
    expect(screen.getByText('Keine bevorstehenden Events gefunden.')).toBeInTheDocument();
  });

  it('renders a list item per event with correct badge', () => {
    const events: MixedEvent[] = [
      { id: '1', title: 'Fight', subtitle: 'Main', sport: 'ufc', date: new Date(), original: {} as any },
      { id: '2', title: 'Box', subtitle: 'Main', sport: 'boxing', date: new Date(), original: {} as any },
    ];
    render(<EventList events={events} onProposeEvent={vi.fn()} disabled={false} />);
    const badges = screen.getAllByTestId('badge').map(el => el.textContent);
    expect(badges).toEqual(['UFC', 'Boxen']);
  });

  it('calls onProposeEvent when event is clicked', async () => {
    const events: MixedEvent[] = [
      { id: '1', title: 'Fight', subtitle: 'Main', sport: 'ufc', date: new Date(), original: {} as any },
    ];
    const onPropose = vi.fn();
    const user = userEvent.setup();
    render(<EventList events={events} onProposeEvent={onPropose} disabled={false} />);
    await user.click(screen.getByTestId('select-Fight'));
    expect(onPropose).toHaveBeenCalledWith('1');
  });

  it('passes constructed payload when AI button clicked', async () => {
    const events: MixedEvent[] = [
      { id: '1', title: 'Fight', subtitle: 'Main', sport: 'ufc', date: new Date(), original: {} as any },
    ];
    const onAi = vi.fn();
    const user = userEvent.setup();
    render(
      <EventList
        events={events}
        onProposeEvent={vi.fn()}
        onCardAiCreate={onAi}
        disabled={false}
      />
    );
    await user.click(screen.getByTestId('ai-Fight'));
    expect(onAi).toHaveBeenCalledWith({ title: 'Fight', subtitle: 'Main', badge: 'UFC' });
  });
});
