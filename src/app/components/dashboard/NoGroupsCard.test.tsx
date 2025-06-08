import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { NoGroupsCard } from './NoGroupsCard';

describe('NoGroupsCard', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders welcome text and create link', () => {
    render(<NoGroupsCard />);
    expect(screen.getByText('Willkommen bei fbet!')).toBeTruthy();
    const link = screen.getByRole('link', { name: /gruppe erstellen/i });
    expect(link.getAttribute('href')).toBe('/groups/create');
  });
});
