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

  it('handles defaults and case-insensitive values', () => {
    const { container: s1 } = render(<>{getSportIcon(undefined)}</>);
    expect(s1.querySelector('svg')).toBeTruthy();
    const { container: s2 } = render(<>{getSportIcon('UFC')}</>);
    expect(s2.querySelector('svg')).toBeTruthy();
    const { container: c1 } = render(<>{getCategoryIcon(undefined)}</>);
    expect(c1.querySelector('svg')).toBeTruthy();
    const { container: c2 } = render(<>{getCategoryIcon('BoXeN')}</>);
    expect(c2.querySelector('svg')).toBeTruthy();
  });

  it('merges complex class name inputs', () => {
    expect(cn('a', ['b', false, 'c'], undefined, 'd')).toBe('a b c d');
  });
});
