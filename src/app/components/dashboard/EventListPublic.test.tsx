import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { EventListPublic } from './EventListPublic';

const publicEvent = {
  id: 'pub1',
  title: 'Public Fight',
  subtitle: 'Main',
  sport: 'boxing',
  date: new Date(),
  original: { date: null, location: null, broadcaster: null, details: null },
};

describe('EventListPublic', () => {
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
    render(<EventListPublic events={[]} onProposeEvent={vi.fn()} />);
    expect(
      screen.getByText('Momentan keine öffentlichen Events verfügbar.')
    ).toBeTruthy();
  });

  it('renders events and handles click', async () => {
    const onPropose = vi.fn();
    render(<EventListPublic events={[publicEvent]} onProposeEvent={onPropose} />);
    expect(screen.getByText('Public Fight')).toBeTruthy();
    const btn = screen.getByRole('button', { name: /wette hinzufügen/i });
    await userEvent.setup().click(btn);
    expect(onPropose).toHaveBeenCalledWith(publicEvent.original);
  });
});
