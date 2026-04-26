import { html, setHtml } from '../dom';

export function renderUnsupported(): HTMLElement {
  const root = document.createElement('section');
  root.className = 'view view--unsupported';
  setHtml(
    root,
    html`
      <h1 class="micro">Clock Sync</h1>
      <div class="card">
        <div class="card__body">
          <div class="card__title">This browser doesn't support Web Bluetooth.</div>
          <div class="card__sub">
            Open this page in <strong>Chrome</strong>, <strong>Edge</strong>, or
            <strong>Brave</strong> on Android or desktop. On iPhone, use the
            native iOS app.
          </div>
        </div>
      </div>
    `,
  );
  return root;
}
