// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NoGroupsCard } from './NoGroupsCard';

describe('NoGroupsCard', () => {
  it('links to /groups/create with correct text', () => {
    render(<NoGroupsCard />);
    const link = screen.getByRole('link', { name: /Gruppe erstellen/i });
    expect(link).toHaveAttribute('href', '/groups/create');
  });
});
