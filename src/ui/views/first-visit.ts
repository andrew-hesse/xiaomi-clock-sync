import { createLiveClock } from '../clock';
import { html, setHtml } from '../dom';

export type FirstVisitProps = { onPair: () => void };

export function renderFirstVisit(props: FirstVisitProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--first-visit';
  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="stage">
        <div data-clock></div>
        <hr class="stage__rule" />
        <div class="stage__caption">no clock paired</div>
      </div>
      <button class="btn btn--ghost" data-pair type="button">Pair Xiaomi clock</button>
      <p class="stage__caption" style="margin-top:-8px;">
        Make sure Bluetooth is on and the clock is within ~5 m.
      </p>
    `,
  );

  const clockSlot = root.querySelector<HTMLElement>('[data-clock]');
  if (clockSlot) createLiveClock().mount(clockSlot);

  root
    .querySelector<HTMLButtonElement>('[data-pair]')
    ?.addEventListener('click', () => props.onPair());

  return root;
}
