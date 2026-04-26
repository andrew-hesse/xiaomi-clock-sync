import { describe, expect, it } from 'vitest';
import { escapeHtml, html } from '../src/ui/dom';

describe('escapeHtml', () => {
  it('escapes the five HTML metacharacters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("a&b'c")).toBe('a&amp;b&#39;c');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('LYWSD02-01')).toBe('LYWSD02-01');
  });
});

describe('html tagged template', () => {
  it('escapes interpolated values but leaves literal markup intact', () => {
    const name = '<img src=x onerror=alert(1)>';
    const out = html`<div class="card">${name}</div>`;
    expect(out).toBe('<div class="card">&lt;img src=x onerror=alert(1)&gt;</div>');
  });

  it('coerces non-string values via String()', () => {
    const out = html`<span>${42}</span>`;
    expect(out).toBe('<span>42</span>');
  });

  it('handles multiple interpolations', () => {
    const a = '<a>';
    const b = 'safe';
    const out = html`[${a}|${b}]`;
    expect(out).toBe('[&lt;a&gt;|safe]');
  });
});
