import type { ClockMeta } from '../../ble/client';
import { shake } from '../animations';
import { createLiveClock } from '../clock';
import { html, setHtml } from '../dom';

export type ErrorProps = { device: ClockMeta | null; message: string; onRetry: () => void };

export function renderError(props: ErrorProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--error';

  const stageBody = props.device
    ? html`
        <div class="stage__device">
          <span class="dot danger"></span>
          <div>
            <div class="stage__name mono">${props.device.name}</div>
            <div class="stage__sub stage__sub--error">${props.message}</div>
          </div>
        </div>
      `
    : html`<div class="error-text">${props.message}</div>`;

  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="stage">
        <div data-clock></div>
        <hr class="stage__rule" />
      </div>
    ` +
      // The stage's third row is conditional (device card vs free-floating
      // text); composed safely because both branches use the html tag.
      html`<div data-error-block></div>` +
      html`<button class="btn btn--danger" data-retry type="button">Try again</button>`,
  );

  // Replace the placeholder slot with the error block markup.
  const slot = root.querySelector<HTMLElement>('[data-error-block]');
  if (slot) {
    setHtml(slot, stageBody);
    // If we rendered a device row, move it INTO the stage so it shares the surface.
    const stage = root.querySelector<HTMLElement>('.stage');
    const moved = slot.firstElementChild;
    if (stage && moved) stage.appendChild(moved);
    slot.remove();
  }

  // Live region (textContent — never HTML).
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.textContent = `Error: ${props.message}`;
  root.appendChild(live);

  const clockSlot = root.querySelector<HTMLElement>('[data-clock]');
  if (clockSlot) createLiveClock().mount(clockSlot);

  const btn = root.querySelector<HTMLButtonElement>('[data-retry]');
  if (btn) {
    shake(btn);
    btn.addEventListener('click', props.onRetry);
  }

  return root;
}
