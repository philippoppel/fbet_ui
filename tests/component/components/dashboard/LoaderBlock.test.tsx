import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { LoaderBlock } from '@/app/components/dashboard/LoaderBlock';

describe('LoaderBlock', () => {
  beforeAll(() => {
    // Ensure React is available globally for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });

  afterEach(() => {
    cleanup();
  });

  it('shows spinner and text', () => {
    render(<LoaderBlock text="Loading" />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Loading')).toBeTruthy();
  });
});
