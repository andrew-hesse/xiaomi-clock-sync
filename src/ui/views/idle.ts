import type { ClockMeta } from '../../ble/client';
import { createHeroClock } from '../clock';
import { html, setHtml } from '../dom';

export type IdleProps = {
  device: ClockMeta;
  lastSyncedAt: number | null;
  onSync: () => void;
  onPickAnother: () => void;
  onForget: () => void;
};

function relativeTime(at: number | null): string {
  if (at === null) return 'never synced';
  const diffSec = Math.floor((Date.now() - at) / 1000);
  if (diffSec < 60) return 'synced just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `synced ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `synced ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `synced ${diffDay}d ago`;
}

export function renderIdle(props: IdleProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--idle';
  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="hero" data-hero></div>
      <div class="card">
        <span class="dot"></span>
        <div class="card__body">
          <div class="card__title mono">${props.device.name}</div>
          <div class="card__sub">${relativeTime(props.lastSyncedAt)}</div>
        </div>
      </div>
      <button class="btn" data-sync type="button">Sync now</button>
      <div class="tertiary">
        <button class="link" data-pick type="button">Use a different clock</button>
        <button class="link" data-forget type="button">Forget this clock</button>
      </div>
    `,
  );

  const heroHost = root.querySelector<HTMLElement>('[data-hero]');
  if (heroHost) createHeroClock().mount(heroHost);

  root.querySelector<HTMLButtonElement>('[data-sync]')?.addEventListener('click', props.onSync);
  root
    .querySelector<HTMLButtonElement>('[data-pick]')
    ?.addEventListener('click', props.onPickAnother);
  root.querySelector<HTMLButtonElement>('[data-forget]')?.addEventListener('click', props.onForget);

  return root;
}
