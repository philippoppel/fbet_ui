import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { EventCard } from '@/app/components/event/EventCard';

describe('EventCard', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const baseProps = {
    title: 'Fight Night',
    subtitle: 'A vs B',
  };

  it('renders title and subtitle', () => {
    render(<EventCard {...baseProps} />);
    expect(screen.getByText('Fight Night')).toBeTruthy();
    expect(screen.getByText('A vs B')).toBeTruthy();
  });

  it('calls onClick when add bet button clicked', async () => {
    const handleClick = vi.fn();
    render(<EventCard {...baseProps} onClick={handleClick} />);
    const btn = screen.getByRole('button', { name: /wette hinzufügen/i });
    await userEvent.setup().click(btn);
    expect(handleClick).toHaveBeenCalled();
  });

  it('calls onAiCreateClick when AI button clicked', async () => {
    const handleAi = vi.fn();
    render(<EventCard {...baseProps} onAiCreateClick={handleAi} />);
    const aiBtn = screen.getByTitle('AI-Wettvorschlag für dieses Event generieren');
    await userEvent.setup().click(aiBtn);
    expect(handleAi).toHaveBeenCalledWith({ title: 'Fight Night', subtitle: 'A vs B', badge: undefined });
  });

  it('disables buttons when disabled', () => {
    render(
      <EventCard {...baseProps} disabled onClick={vi.fn()} onAiCreateClick={vi.fn()} />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) =>
      expect(btn.getAttribute('disabled')).not.toBeNull()
    );
  });
});
