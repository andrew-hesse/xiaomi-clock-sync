import type { ClockMeta } from '../../ble/client';
import { progressArc } from '../animations';
import { createHeroClock } from '../clock';
import { html, setHtml } from '../dom';

export type BusyProps = { device: ClockMeta; phase: 'connecting' | 'syncing' };

export function renderBusy(props: BusyProps): HTMLElement {
  const label = props.phase === 'connecting' ? 'connecting…' : 'syncing time…';

  const root = document.createElement('section');
  root.className = 'view view--busy';
  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="hero" data-hero></div>
      <div class="card">
        <span class="dot accent pulsing"></span>
        <div class="card__body">
          <div class="card__title mono">${props.device.name}</div>
          <div class="card__sub">${label}</div>
        </div>
      </div>
      <div class="busy-stage">
        <div class="busy-stage__halo" aria-hidden="true"></div>
        <div class="btn btn--circle" data-arc style="background:transparent;color:var(--accent);"></div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">${label}</div>
    `,
  );

  const heroHost = root.querySelector<HTMLElement>('[data-hero]');
  if (heroHost) createHeroClock().mount(heroHost);

  const arcHost = root.querySelector<HTMLElement>('[data-arc]');
  if (arcHost) progressArc(arcHost, 1400);

  return root;
}
