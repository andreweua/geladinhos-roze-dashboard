import fs from "node:fs";
import zlib from "node:zlib";

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function createIconPng(size, outPath) {
  const raw = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = rowStart + 1 + x * 4;

      // Gradient background: Rose (#e11d48) to Warm Peach/Amber (#fb923c)
      const t = (nx + ny) / 2;
      let r = Math.round(225 * (1 - t) + 251 * t);
      let g = Math.round(29 * (1 - t) + 146 * t);
      let b = Math.round(72 * (1 - t) + 60 * t);

      // Popsicle body (rounded top, flat bottom)
      const dx = (nx - 0.5) / 0.19;
      const dyTop = (ny - 0.34) / 0.19;
      const inTopCircle = dx * dx + dyTop * dyTop <= 1.0;
      const inBodyRect = Math.abs(nx - 0.5) <= 0.19 && ny >= 0.34 && ny <= 0.66;
      const inPopsicle = inTopCircle || inBodyRect;

      // Popsicle stick
      const inStick = Math.abs(nx - 0.5) <= 0.055 && ny > 0.66 && ny <= 0.84;

      if (inPopsicle) {
        const wave = 0.43 + 0.025 * Math.sin(nx * 22);
        if (ny < wave) {
          r = 251;
          g = 113;
          b = 133;
        } else {
          r = 255;
          g = 241;
          b = 242;
        }
      } else if (inStick) {
        r = 251;
        g = 191;
        b = 36;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, png);
}

createIconPng(180, "public/apple-touch-icon.png");
createIconPng(192, "public/pwa-192x192.png");
createIconPng(512, "public/pwa-512x512.png");
console.log("Generated public/apple-touch-icon.png, public/pwa-192x192.png, public/pwa-512x512.png");
