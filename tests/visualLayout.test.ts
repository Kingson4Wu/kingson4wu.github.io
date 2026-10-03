import { expect, it } from 'vitest';
import { evaluateVisualLayout, type VisualLayoutSnapshot } from '../site/eval/visualLayout.js';

const good: VisualLayoutSnapshot = {
  viewportWidth: 390,
  main: { left: 12, right: 378 },
  heading: { left: 12, right: 370 },
  proseFontSize: 16.7,
  content: [{ label: 'figure image', left: 20, right: 370 }],
};

it('accepts a readable article layout that fits the viewport', () => {
  expect(evaluateVisualLayout(good)).toEqual([]);
});

it('catches content clipped by overflow hidden and prose that becomes too small', () => {
  const bad = { ...good, proseFontSize: 13, content: [{ label: 'figure image', left: 20, right: 420 }] };
  expect(evaluateVisualLayout(bad)).toContain('figure image extends outside the viewport');
  expect(evaluateVisualLayout(bad)).toContain('article text is smaller than 16px');
});
