import type { ClockMeta } from '../../ble/client';
import { shake } from '../animations';
import { createHeroClock } from '../clock';
import { html, setHtml } from '../dom';

export type ErrorProps = { device: ClockMeta | null; message: string; onRetry: () => void };

export function renderError(props: ErrorProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--error';

  const errorBlock = props.device
    ? html`
        <div class="card">
          <span class="dot danger"></span>
          <div class="card__body">
            <div class="card__title mono">${props.device.name}</div>
            <div class="card__sub error-text">${props.message}</div>
          </div>
        </div>
      `
    : html`<p class="error-text">${props.message}</p>`;

  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="hero" data-hero></div>
    ` +
      errorBlock +
      html`
        <button class="btn btn--danger" data-retry type="button">Try again</button>
      `,
  );

  // Live-region announcement uses textContent so the message can never be HTML.
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.textContent = `Error: ${props.message}`;
  root.appendChild(live);

  const heroHost = root.querySelector<HTMLElement>('[data-hero]');
  if (heroHost) createHeroClock().mount(heroHost);

  const btn = root.querySelector<HTMLButtonElement>('[data-retry]');
  if (btn) {
    shake(btn);
    btn.addEventListener('click', props.onRetry);
  }

  return root;
}
