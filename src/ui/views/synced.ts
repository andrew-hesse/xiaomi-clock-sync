import type { ClockMeta } from '../../ble/client';
import { flash, progressArc } from '../animations';
import { createHeroClock } from '../clock';
import { html, setHtml } from '../dom';

export type SyncedProps = { device: ClockMeta; at: number };

export function renderSynced(props: SyncedProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--synced';
  const announcement = `Synced at ${new Date(props.at).toLocaleTimeString()}`;
  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="hero" data-hero></div>
      <div class="card" data-card>
        <span class="dot accent"></span>
        <div class="card__body">
          <div class="card__title mono">${props.device.name}</div>
          <div class="card__sub">synced just now</div>
        </div>
      </div>
      <div class="busy-stage">
        <div class="btn btn--circle" data-arc style="background:transparent;color:var(--accent);"></div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">${announcement}</div>
    `,
  );

  const hero = createHeroClock();
  const heroHost = root.querySelector<HTMLElement>('[data-hero]');
  if (heroHost) hero.mount(heroHost);

  const arcHost = root.querySelector<HTMLElement>('[data-arc]');
  const card = root.querySelector<HTMLElement>('[data-card]');
  if (arcHost) {
    const arc = progressArc(arcHost, 1);
    requestAnimationFrame(() => {
      arc.complete();
      hero.pulse();
      if (card) flash(card);
    });
  }

  return root;
}
