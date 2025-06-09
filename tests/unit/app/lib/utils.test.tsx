import { getSportIcon, getCategoryIcon, cn } from '@/app/lib/utils';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';

describe('utils', () => {
  beforeAll(() => {
    // ensure React is available for classic runtime JSX
    // @ts-ignore
    globalThis.React = React;
  });
  it('returns sport icon react elements', () => {
    const { container } = render(<>{getSportIcon('ufc')}</>);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('returns category icon react elements', () => {
    const { container } = render(<>{getCategoryIcon('boxen')}</>);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
