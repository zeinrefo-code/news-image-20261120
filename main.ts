// The World in One Day — Friday 20 November 2026.
// A newspaper front page drawn entirely in code: Node 22 standard library
// only, no network, no downloaded images. Writes a deterministic 1024x1024
// PNG to $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [246, 241, 227];
const INK: [number, number, number] = [28, 28, 28];
const RED: [number, number, number] = [163, 22, 33];
const NAVY: [number, number, number] = [31, 56, 100];
const GOLD: [number, number, number] = [176, 141, 58];
const WHITE: [number, number, number] = [250, 250, 248];
const GREY: [number, number, number] = [90, 84, 72];

type RGB = [number, number, number];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPx(i, j, c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, t, h, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPx(cx + x, cy + y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let y = -r - t; y <= r + t; y++) {
    for (let x = -r - t; x <= r + t; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d >= r - t && d <= r + t) setPx(cx + x, cy + y, c);
    }
  }
}

// Five-pointed star, filled, pointing up.
function star(cx: number, cy: number, r: number, c: RGB): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + Math.round(rad * Math.cos(a)), cy + Math.round(rad * Math.sin(a))]);
  }
  // Scanline fill of the star polygon.
  let minY = pts[0][1];
  let maxY = pts[0][1];
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 10];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = xs[k]; x <= xs[k + 1]; x++) setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- font --
// Hand-drawn 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit
// number, most significant bit on the left. Only capitals, digits and the
// punctuation this page needs.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '—': [0, 0, 0, 0x1f, 0, 0, 0],
  '–': [0, 0, 0, 0x0e, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '+': [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '•': [0, 0, 0x0c, 0x0c, 0x0c, 0, 0],
};

const EMPTY = [0, 0, 0, 0, 0, 0, 0];

function glyphOf(ch: string): number[] {
  if (ch === '’') ch = "'";
  return FONT[ch] ?? EMPTY;
}

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = glyphOf(up[ci]);
    const gx = x + ci * 6 * scale;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row & (1 << (4 - col))) {
          fillRect(gx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

function wrapText(s: string, maxChars: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawParaCentered(cx: number, y: number, s: string, scale: number, c: RGB, maxChars: number, lineH: number): number {
  const lines = wrapText(s, maxChars);
  for (let i = 0; i < lines.length; i++) {
    drawTextCentered(cx, y + i * lineH, lines[i], scale, c);
  }
  return y + lines.length * lineH;
}

function drawParaLeft(x: number, y: number, s: string, scale: number, c: RGB, maxChars: number, lineH: number): number {
  const lines = wrapText(s, maxChars);
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * lineH, lines[i], scale, c);
  }
  return y + lines.length * lineH;
}

// ---------------------------------------------------------------- png ---
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- flags ----
function drawUSFlag(x: number, y: number, w: number, h: number): void {
  const stripeH = h / 13;
  for (let i = 0; i < 13; i++) {
    fillRect(x, y + Math.round(i * stripeH), w, Math.ceil(stripeH), i % 2 === 0 ? RED : WHITE);
  }
  const cw = Math.round(w * 0.4);
  const ch = Math.round(stripeH * 7);
  fillRect(x, y, cw, ch, NAVY);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      disc(x + 8 + c * Math.round((cw - 16) / 4), y + 6 + r * Math.round((ch - 12) / 3), 2, WHITE);
    }
  }
  frame(x, y, w, h, INK, 2);
}

function drawChinaFlag(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, RED);
  star(x + Math.round(w * 0.16), y + Math.round(h * 0.28), 13, GOLD);
  const small: [number, number][] = [
    [0.36, 0.14],
    [0.45, 0.26],
    [0.45, 0.44],
    [0.36, 0.56],
  ];
  for (const [fx, fy] of small) {
    star(x + Math.round(w * fx), y + Math.round(h * fy), 5, GOLD);
  }
  frame(x, y, w, h, INK, 2);
}

function drawRussiaFlag(x: number, y: number, w: number, h: number): void {
  const band = h / 3;
  fillRect(x, y, w, Math.ceil(band), WHITE);
  fillRect(x, y + Math.round(band), w, Math.ceil(band), NAVY);
  fillRect(x, y + Math.round(2 * band), w, h - Math.round(2 * band), RED);
  frame(x, y, w, h, INK, 2);
}

// ------------------------------------------------------- cell artwork ---
function drawChart(x: number, y: number, w: number, h: number): void {
  // Rising bars with an arrow — the market debut.
  const bars = [10, 16, 14, 22, 20, 30];
  const bw = Math.floor(w / bars.length);
  for (let i = 0; i < bars.length; i++) {
    const bh = bars[i];
    fillRect(x + i * bw + 3, y + h - bh, bw - 6, bh, i === bars.length - 1 ? RED : NAVY);
  }
  line(x + 2, y + h - 12, x + w - 26, y + 4, RED);
  line(x + w - 26, y + 4, x + w - 14, y + 4, RED);
  line(x + w - 26, y + 4, x + w - 26, y + 16, RED);
  hline(x, y + h - 1, w, INK, 2);
}

function drawBurst(x: number, y: number, w: number, h: number): void {
  // Four missile streaks and a burst — the Kyiv strike.
  const cy = y + Math.round(h / 2);
  for (let i = 0; i < 4; i++) {
    const yy = y + 4 + i * 9;
    line(x + 6, yy, x + w - 40 - i * 12, yy, INK);
    disc(x + w - 36 - i * 12, yy, 3, RED);
  }
  star(x + w - 22, cy, 12, GOLD);
  ring(x + w - 22, cy, 16, RED, 2);
}

function drawTanker(x: number, y: number, w: number, h: number): void {
  // A tanker on waves, smoke rising — the Hormuz mine strike.
  const hy = y + h - 14;
  fillRect(x + 8, hy - 12, w - 16, 12, NAVY);
  fillRect(x + w - 34, hy - 26, 12, 14, RED);
  fillRect(x + 14, hy - 20, 10, 8, INK);
  // Flame above the funnel.
  disc(x + w - 28, hy - 32, 4, GOLD);
  disc(x + w - 28, hy - 38, 3, RED);
  // Waves.
  for (let i = 0; i < 5; i++) {
    const wx = x + 4 + i * Math.round((w - 8) / 5);
    line(wx, hy + 6, wx + 10, hy + 6, NAVY);
  }
}

function drawBaseball(x: number, y: number, w: number, h: number): void {
  // A baseball and the diamond — Pete Rose.
  const cx = x + 22;
  const cy = y + Math.round(h / 2);
  disc(cx, cy, 14, WHITE);
  ring(cx, cy, 14, INK, 2);
  line(cx - 6, cy - 12, cx - 2, cy + 12, RED);
  line(cx + 6, cy - 12, cx + 2, cy + 12, RED);
  // Home plate and base paths, drawn as a clear diamond.
  const bx = x + w - 130;
  const by = y + h - 6;
  line(bx, by, bx + 34, by - 30, INK);
  line(bx + 34, by - 30, bx + 68, by, INK);
  line(bx + 68, by, bx + 34, by + 0, INK);
  line(bx + 34, by, bx, by, INK);
  disc(bx + 34, by - 30, 4, RED);
  disc(bx + 68, by, 4, RED);
  disc(bx, by, 4, RED);
  disc(bx + 34, by, 4, RED);
}

// -------------------------------------------------------------- page ----
function drawPage(): void {
  // Double frame.
  frame(14, 14, W - 28, H - 28, INK, 3);
  frame(24, 24, W - 48, H - 48, INK, 1);

  // Masthead.
  drawTextCentered(512, 46, 'THE WORLD IN ONE DAY', 7, INK);
  drawTextCentered(512, 106, 'FRIDAY, 20 NOVEMBER 2026', 3, RED);
  hline(120, 138, 784, INK, 4);
  hline(120, 146, 784, INK, 1);

  // Lead story.
  drawTextCentered(512, 162, '• DIPLOMACY • LEAD STORY •', 2, RED);
  drawTextCentered(512, 190, 'TRUMP, XI AND PUTIN', 4, INK);
  drawTextCentered(512, 226, 'JOINT PEACE DECLARATION', 4, INK);
  drawParaCentered(
    512,
    268,
    "A DAY AFTER THEIR HISTORIC FIRST TRILATERAL SUMMIT IN SHENZHEN, THE THREE LEADERS ISSUE A JOINT DECLARATION ON THE APEC SIDELINES, PLEDGING TO COOL THE WORLD'S HOTTEST CONFLICTS.",
    2,
    INK,
    72,
    20,
  );

  // The three flags.
  const fy = 344;
  const fw = 300;
  const fh = 84;
  drawUSFlag(36, fy, fw, fh);
  drawChinaFlag(362, fy, fw, fh);
  drawRussiaFlag(688, fy, fw, fh);
  drawTextCentered(186, fy + fh + 6, 'UNITED STATES', 2, GREY);
  drawTextCentered(512, fy + fh + 6, 'CHINA', 2, GREY);
  drawTextCentered(838, fy + fh + 6, 'RUSSIA', 2, GREY);

  hline(36, 458, 952, INK, 2);

  // Four stories in a 2x2 grid.
  const stories = [
    {
      kicker: 'BUSINESS',
      head: ['ANTHROPIC SOARS 17%', 'ON MARKET DEBUT'],
      body: 'THE FIRST PURELY AI COMPANY TO LIST. IPO PRICED AT $83 A SHARE, VALUED AT $81.3B — THE BIGGEST EVER.',
      art: drawChart,
    },
    {
      kicker: 'UKRAINE',
      head: ['KYIV HIT BY FOUR', 'BALLISTIC MISSILES'],
      body: 'EUROPEAN LEADERS SAY THEY ARE READY FOR TALKS WITH RUSSIA ON ENDING THE WAR.',
      art: drawBurst,
    },
    {
      kicker: 'MIDDLE EAST',
      head: ['IRAN WIDENS ATTACKS', 'ACROSS THE GULF'],
      body: 'HOUTHIS CLAIM DRONE AND MISSILE STRIKES ON FOUR SAUDI TARGETS. A TANKER BURNS AFTER HITTING A MINE EAST OF THE STRAIT OF HORMUZ.',
      art: drawTanker,
    },
    {
      kicker: 'USA',
      head: ['TRUMP PARDONS', 'PETE ROSE'],
      body: 'THE PRESIDENT POSTHUMOUSLY PARDONS BASEBALL LEGEND PETE ROSE, BANNED FROM THE GAME SINCE 1989.',
      art: drawBaseball,
    },
  ];

  const cellW = 464;
  const cellH = 212;
  const origins: [number, number][] = [
    [36, 474],
    [524, 474],
    [36, 702],
    [524, 702],
  ];
  for (let i = 0; i < 4; i++) {
    const s = stories[i];
    const [ox, oy] = origins[i];
    drawText(ox, oy, s.kicker, 2, RED);
    hline(ox, oy + 20, cellW, INK, 1);
    drawText(ox, oy + 28, s.head[0], 3, INK);
    drawText(ox, oy + 55, s.head[1], 3, INK);
    drawParaLeft(ox, oy + 90, s.body, 2, INK, 38, 18);
    s.art(ox, oy + 168, cellW, 40);
  }
  // Grid dividers.
  vline(512, 474, cellH, INK, 1);
  vline(512, 702, cellH, INK, 1);
  hline(36, 694, 952, INK, 1);

  // Footer.
  hline(36, 928, 952, INK, 2);
  drawTextCentered(512, 942, 'THE WORLD IN ONE DAY • FRIDAY 20 NOVEMBER 2026', 2, INK);
  drawTextCentered(512, 966, 'FIVE STORIES FROM ONE DAY — DRAWN IN CODE', 2, GREY);
}

drawPage();

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(outDir + '/entry.png', encodePNG());
