import type { ClockMeta } from '../../ble/client';
import { flash, progressArc } from '../animations';
import { createLiveClock } from '../clock';
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
      <div class="stage" data-stage>
        <div data-clock></div>
        <hr class="stage__rule" />
        <div class="stage__device">
          <span class="dot accent"></span>
          <div>
            <div class="stage__name mono">${props.device.name}</div>
            <div class="stage__sub">synced just now</div>
          </div>
        </div>
      </div>
      <div class="busy-stage">
        <div class="busy-stage__circle" data-arc></div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">${announcement}</div>
    `,
  );

  const clock = createLiveClock();
  const clockSlot = root.querySelector<HTMLElement>('[data-clock]');
  if (clockSlot) clock.mount(clockSlot);

  const arcHost = root.querySelector<HTMLElement>('[data-arc]');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  if (arcHost) {
    const arc = progressArc(arcHost, 1);
    requestAnimationFrame(() => {
      arc.complete();
      clock.pulse();
      if (stage) flash(stage);
    });
  }

  return root;
}
