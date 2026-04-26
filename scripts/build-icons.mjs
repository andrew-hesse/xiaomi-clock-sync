import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'src/icon.svg');
const out = join(root, 'public/icons');

async function main() {
  await mkdir(out, { recursive: true });
  const svg = await readFile(src);

  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(join(out, `icon-${size}.png`));
  }

  // Maskable: content scaled to 76% with solid background — 12% safe zone each side.
  const maskableSize = 512;
  const inner = Math.round(maskableSize * 0.76);
  const padding = Math.round((maskableSize - inner) / 2);
  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 0x0e, g: 0x11, b: 0x16, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(svg).resize(inner, inner).png().toBuffer(),
        top: padding,
        left: padding,
      },
    ])
    .png()
    .toFile(join(out, 'icon-maskable-512.png'));

  // Favicon as a small PNG (most browsers prefer 32×32 for the tab); we keep
  // the SVG link in index.html pointing at this filename.
  await sharp(svg).resize(64, 64).png().toFile(join(out, 'favicon.png'));

  console.log('Icons written to', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
