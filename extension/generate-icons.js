// node generate-icons.js  — no dependencies, uses only built-in Node.js modules
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────────
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function makePNG(size, drawPixel) {
  // Raw pixel data: one filter byte (0 = None) per row + RGBA pixels
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y);
      const off = y * (1 + size * 4) + 1 + x * 4;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a;
    }
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon drawing ──────────────────────────────────────────────────────────────
function hex(str) {
  return [
    parseInt(str.slice(1,3), 16),
    parseInt(str.slice(3,5), 16),
    parseInt(str.slice(5,7), 16),
  ];
}

const BG     = hex('#0a0a0f');
const ACCENT = hex('#a855f7');

const sizes = [16, 48, 128];

for (const size of sizes) {
  const cx   = size / 2;
  const cy   = size / 2;
  const outerR  = size * 0.44;
  const ringW   = Math.max(1.5, size * 0.055);
  const innerR  = size * 0.28;
  const dotR    = size * 0.11;

  const png = makePNG(size, (x, y) => {
    const d = Math.sqrt((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2);
    if (d <= dotR)                        return [...BG,     255];
    if (d <= innerR)                      return [...ACCENT, 255];
    if (d >= outerR - ringW && d <= outerR) return [...ACCENT, 255];
    return [...BG, 255];
  });

  const out = path.join(__dirname, 'icons', `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`  icon-${size}.png`);
}

console.log('Done.');
