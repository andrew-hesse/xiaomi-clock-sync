export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tagged-template helper that escapes all interpolated values.
// Use this anywhere you'd otherwise concatenate untrusted strings into HTML.
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += escapeHtml(String(values[i]));
  }
  return out;
}

// Replaces the contents of `host` with parsed HTML.
// DOMParser in 'text/html' mode does NOT execute scripts (defense in depth) —
// combined with the `html` tag, this gives two layers of XSS protection.
export function setHtml(host: Element, safeHtml: string): void {
  const doc = new DOMParser().parseFromString(safeHtml, 'text/html');
  host.replaceChildren(...Array.from(doc.body.childNodes));
}
