import { describe, expect, it } from 'vitest';
import { escapeHtml, stripHtml } from '../site/utils/html.js';

describe('html helpers', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml('<a href="x">A&B</a>')).toBe('&lt;a href=&quot;x&quot;&gt;A&amp;B&lt;/a&gt;');
  });

  it('strips tags from rendered snippets', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });
});
