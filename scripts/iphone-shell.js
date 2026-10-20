const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function icon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const coin = size * 0.34;
  const rim = size * 0.035;
  const margin = size * 0.06;
  const radius = size * 0.22;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const left = margin;
      const right = size - 1 - margin;
      const top = margin;
      const bottom = size - 1 - margin;
      let nearX = x;
      let nearY = y;
      if (x < left + radius && y < top + radius) { nearX = left + radius; nearY = top + radius; }
      else if (x > right - radius && y < top + radius) { nearX = right - radius; nearY = top + radius; }
      else if (x < left + radius && y > bottom - radius) { nearX = left + radius; nearY = bottom - radius; }
      else if (x > right - radius && y > bottom - radius) { nearX = right - radius; nearY = bottom - radius; }
      const corner = (x < left + radius || x > right - radius) && (y < top + radius || y > bottom - radius);
      const outside = x < left || x > right || y < top || y > bottom || (corner && Math.hypot(x - nearX, y - nearY) > radius);
      const dist = Math.hypot(x - cx, y - cy);
      let red = 12;
      let green = 18;
      let blue = 40;
      let alpha = outside ? 0 : 255;
      if (!outside && dist < coin) { red = 245; green = 165; blue = 36; }
      else if (!outside && dist < coin + rim) { red = 196; green = 132; blue = 29; }
      const pixel = row + 1 + x * 4;
      raw[pixel] = red;
      raw[pixel + 1] = green;
      raw[pixel + 2] = blue;
      raw[pixel + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const manifest = {
  name: 'Gold Store',
  short_name: 'Gold Store',
  id: 'https://cooppos.cyberneticde.site/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0c1228',
  theme_color: '#0c1228',
  icons: [
    { src: '/icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
};

const files = {
  'icon-180.png': icon(180),
  'icon-192.png': icon(192),
  'icon-512.png': icon(512),
  'apple-touch-icon.png': icon(180),
  'manifest.webmanifest': Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
};

function writeSet(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), data);
}

writeSet(publicDir);
if (fs.existsSync(distDir)) writeSet(distDir);

const htmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const tags = [
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    '<meta name="theme-color" content="#0c1228" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="apple-mobile-web-app-title" content="Gold Store" />',
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<link rel="icon" href="/icon-192.png" />',
  ].join('\n    ');
  html = html.replace(/<meta name="viewport"[^>]*>/i, '');
  if (!html.includes('manifest.webmanifest')) {
    html = html.replace('</head>', `    ${tags}\n  </head>`);
  }
  fs.writeFileSync(htmlPath, html);
  console.log('iPhone home-screen tags added to dist/index.html');
}
