import { html, setHtml } from './dom';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type HeroClock = { mount(host: HTMLElement): void; pulse(): void; stop(): void };

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatOffset(d: Date): string {
  const minutes = -d.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(minutes) / 60);
  return `UTC${sign}${hours}`;
}

export function createHeroClock(): HeroClock {
  let host: HTMLElement | null = null;
  let raf = 0;
  let lastSecond = -1;

  function render(now: Date): void {
    if (!host) return;
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const dim = now.getMilliseconds() >= 500 ? 'dim' : '';
    const day = WEEKDAYS[now.getDay()] ?? '';
    const month = MONTHS[now.getMonth()] ?? '';

    setHtml(
      host,
      html`
      <div class="hero__time mono" aria-hidden="true">
        <span class="digit">${hh}</span><span class="colon ${dim}">:</span><span class="digit">${mm}</span><span class="colon ${dim}">:</span><span class="digit">${ss}</span>
      </div>
      <div class="hero__date">
        ${day} · ${now.getDate()} ${month} · ${formatOffset(now)}
      </div>
      <span class="sr-only" aria-live="off">Current time ${hh}:${mm}</span>
    `,
    );
  }

  function tick(): void {
    const now = new Date();
    if (now.getSeconds() !== lastSecond) {
      lastSecond = now.getSeconds();
      render(now);
    } else if (host) {
      const dim = now.getMilliseconds() >= 500;
      for (const c of host.querySelectorAll<HTMLSpanElement>('.colon')) {
        c.classList.toggle('dim', dim);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    mount(h) {
      host = h;
      lastSecond = -1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    },
    pulse() {
      if (!host) return;
      const time = host.querySelector<HTMLElement>('.hero__time');
      if (!time) return;
      time.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }],
        { duration: 400, easing: 'ease-out' },
      );
    },
    stop() {
      cancelAnimationFrame(raf);
      host = null;
    },
  };
}
