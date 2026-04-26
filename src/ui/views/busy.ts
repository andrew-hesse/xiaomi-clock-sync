import type { ClockMeta } from '../../ble/client';
import { progressArc } from '../animations';
import { createLiveClock } from '../clock';
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
      <div class="stage">
        <div data-clock></div>
        <hr class="stage__rule" />
        <div class="stage__device">
          <span class="dot accent pulsing"></span>
          <div>
            <div class="stage__name mono">${props.device.name}</div>
            <div class="stage__sub">${label}</div>
          </div>
        </div>
      </div>
      <div class="busy-stage">
        <div class="busy-stage__halo" aria-hidden="true"></div>
        <div class="busy-stage__circle" data-arc></div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">${label}</div>
    `,
  );

  const clockSlot = root.querySelector<HTMLElement>('[data-clock]');
  if (clockSlot) createLiveClock().mount(clockSlot);

  const arcHost = root.querySelector<HTMLElement>('[data-arc]');
  if (arcHost) progressArc(arcHost, 1400);

  return root;
}
