import type { AppState, Signal } from '../state';
import { renderBusy } from './views/busy';
import { renderError } from './views/error';
import { renderFirstVisit } from './views/first-visit';
import { renderIdle } from './views/idle';
import { renderSynced } from './views/synced';
import { renderUnsupported } from './views/unsupported';

export type Handlers = {
  onPair: () => void;
  onSync: () => void;
  onPickAnother: () => void;
  onForget: () => void;
  onRetry: () => void;
};

export function mountApp(root: HTMLElement, state: Signal<AppState>, handlers: Handlers): void {
  function render(s: AppState): void {
    let next: HTMLElement;
    switch (s.kind) {
      case 'unsupported':
        next = renderUnsupported();
        break;
      case 'first-visit':
        next = renderFirstVisit({ onPair: handlers.onPair });
        break;
      case 'idle':
        next = renderIdle({
          device: s.device,
          lastSyncedAt: s.lastSyncedAt,
          onSync: handlers.onSync,
          onPickAnother: handlers.onPickAnother,
          onForget: handlers.onForget,
        });
        break;
      case 'connecting':
        next = renderBusy({ device: s.device, phase: 'connecting' });
        break;
      case 'syncing':
        next = renderBusy({ device: s.device, phase: 'syncing' });
        break;
      case 'synced':
        next = renderSynced({ device: s.device, at: s.at });
        break;
      case 'error':
        next = renderError({ device: s.device, message: s.message, onRetry: handlers.onRetry });
        break;
    }
    root.replaceChildren(next);
  }

  render(state.get());
  state.subscribe(render);
}
