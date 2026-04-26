const SVG_NS = 'http://www.w3.org/2000/svg';

export function shake(el: HTMLElement): void {
  el.classList.remove('shake');
  // Force reflow so the animation restarts even on repeated triggers.
  void el.offsetWidth;
  el.classList.add('shake');
}

export function flash(el: HTMLElement): void {
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 800);
}

// Renders a sweeping circular progress arc inside `host`.
// Returns a `complete()` function that draws a checkmark over the arc.
export function progressArc(host: HTMLElement, durationMs = 1200): { complete: () => void } {
  while (host.firstChild) host.removeChild(host.firstChild);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('width', '56');
  svg.setAttribute('height', '56');

  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('cx', '28');
  ring.setAttribute('cy', '28');
  ring.setAttribute('r', '22');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'currentColor');
  ring.setAttribute('stroke-width', '3');
  ring.setAttribute('stroke-linecap', 'round');
  ring.setAttribute('opacity', '0.25');
  svg.appendChild(ring);

  const arc = document.createElementNS(SVG_NS, 'circle');
  arc.setAttribute('cx', '28');
  arc.setAttribute('cy', '28');
  arc.setAttribute('r', '22');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'currentColor');
  arc.setAttribute('stroke-width', '3');
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('transform', 'rotate(-90 28 28)');
  const circumference = 2 * Math.PI * 22;
  arc.style.strokeDasharray = `${circumference}`;
  arc.style.strokeDashoffset = `${circumference}`;
  arc.style.transition = `stroke-dashoffset ${durationMs}ms cubic-bezier(.4,0,.2,1)`;
  svg.appendChild(arc);

  host.appendChild(svg);
  requestAnimationFrame(() => {
    arc.style.strokeDashoffset = '0';
  });

  return {
    complete() {
      arc.style.strokeDashoffset = '0';
      const check = document.createElementNS(SVG_NS, 'path');
      check.setAttribute('d', 'M17 28 L25 36 L40 21');
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', 'currentColor');
      check.setAttribute('stroke-width', '3');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      const len = 40;
      check.style.strokeDasharray = `${len}`;
      check.style.strokeDashoffset = `${len}`;
      check.style.transition = 'stroke-dashoffset 280ms cubic-bezier(.4,0,.2,1)';
      svg.appendChild(check);
      requestAnimationFrame(() => {
        check.style.strokeDashoffset = '0';
      });
    },
  };
}
