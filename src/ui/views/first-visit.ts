import { createHeroClock } from '../clock';
import { html, setHtml } from '../dom';

export type FirstVisitProps = { onPair: () => void };

export function renderFirstVisit(props: FirstVisitProps): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--first-visit';
  setHtml(
    root,
    html`
      <header class="header"><span class="micro">Clock Sync</span></header>
      <div class="hero" data-hero></div>
      <div class="hero__caption">no clock paired</div>
      <button class="btn btn--ghost" data-pair type="button">
        Pair Xiaomi clock
      </button>
      <p class="card__sub" style="text-align:center;">
        Make sure Bluetooth is on and the clock is within ~5 metres.
      </p>
    `,
  );

  const heroHost = root.querySelector<HTMLElement>('[data-hero]');
  if (heroHost) createHeroClock().mount(heroHost);

  const pairBtn = root.querySelector<HTMLButtonElement>('[data-pair]');
  pairBtn?.addEventListener('click', () => props.onPair());

  return root;
}
