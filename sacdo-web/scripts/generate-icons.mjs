import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const source = join(__dir, '../../sacdo-app/assets/logo.png');

// ── Install icons (keep white background) ───────────────────────────────────
for (const size of [192, 512]) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(join(__dir, `../public/icons/icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// Favicon
await sharp(source).resize(32, 32).png().toFile(join(__dir, '../public/favicon.png'));
console.log('✓ favicon.png');

// ── Transparent logo for sign-in pages ──────────────────────────────────────
// Remove near-white pixels by zeroing their alpha channel
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  // Any pixel where all channels are > 240 is treated as background
  if (r > 240 && g > 240 && b > 240) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(join(__dir, '../public/logo-transparent.png'));
console.log('✓ logo-transparent.png');

console.log('Done.');
