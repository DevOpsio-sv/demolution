import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brand = path.join(root, "assets", "brand");
const publicDir = path.join(root, "public");

const BG = [246, 245, 241];
const BLACK = [12, 12, 12];
const ORANGE = [202, 88, 17];

function dist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function unmix(color, fg, bg) {
  const alphas = [];
  for (let channel = 0; channel < 3; channel++) {
    const denom = fg[channel] - bg[channel];
    if (Math.abs(denom) < 12) continue;
    alphas.push((color[channel] - bg[channel]) / denom);
  }
  const alpha = Math.min(1, Math.max(0, alphas.reduce((sum, value) => sum + value, 0) / alphas.length));
  let error = 0;
  for (let channel = 0; channel < 3; channel++) {
    const reconstructed = fg[channel] * alpha + bg[channel] * (1 - alpha);
    error += Math.abs(reconstructed - color[channel]);
  }
  return { alpha, error };
}

function knockOutWordmark(data, width, height) {
  const out = Buffer.alloc(data.length);
  for (let offset = 0; offset < data.length; offset += 4) {
    const sourceAlpha = data[offset + 3] / 255;
    const observed = [0, 1, 2].map((channel) => Math.round(data[offset + channel] * sourceAlpha + BG[channel] * (1 - sourceAlpha)));
    if (dist(observed, BG) < 16) continue;

    const black = unmix(observed, BLACK, BG);
    const orange = unmix(observed, ORANGE, BG);
    const useOrange = orange.error + 4 < black.error;
    const chosen = useOrange ? orange : black;
    const solid = chosen.alpha > 0.94;
    const color = solid ? observed : useOrange ? ORANGE : BLACK;
    const alpha = solid ? 255 : Math.round(Math.min(1, Math.max(0, chosen.alpha)) * 255);
    if (alpha < 8) continue;
    out[offset] = color[0];
    out[offset + 1] = color[1];
    out[offset + 2] = color[2];
    out[offset + 3] = alpha;
  }
  return out;
}

function trim(data, width, height, pad) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;
  const cropped = Buffer.alloc(croppedWidth * croppedHeight * 4);
  for (let y = 0; y < croppedHeight; y++) {
    data.copy(cropped, y * croppedWidth * 4, ((y + minY) * width + minX) * 4, ((y + minY) * width + minX + croppedWidth) * 4);
  }
  return { data: cropped, width: croppedWidth, height: croppedHeight };
}

async function pngFromRaw(data, width, height) {
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

function icoFromPngs(images) {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = headerSize;
  const parts = [header];
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(image.width >= 256 ? 0 : image.width, entry);
    header.writeUInt8(image.height >= 256 ? 0 : image.height, entry);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.buffer.length;
    parts.push(image.buffer);
  });
  return Buffer.concat(parts);
}

export async function buildLogo() {
  await mkdir(publicDir, { recursive: true });

  const master = sharp(path.join(brand, "razlom-wordmark-master.png")).ensureAlpha();
  const masterRaw = await master.raw().toBuffer({ resolveWithObject: true });
  const knocked = knockOutWordmark(masterRaw.data, masterRaw.info.width, masterRaw.info.height);
  const wordmark = trim(knocked, masterRaw.info.width, masterRaw.info.height, 8);
  const wordmarkPng = await pngFromRaw(wordmark.data, wordmark.width, wordmark.height);
  await writeFile(path.join(publicDir, "razlom-logo.png"), wordmarkPng);

  const inverseRaw = await sharp(path.join(brand, "razlom-wordmark-on-dark.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const inverse = trim(inverseRaw.data, inverseRaw.info.width, inverseRaw.info.height, 8);
  const inversePng = await pngFromRaw(inverse.data, inverse.width, inverse.height);
  await writeFile(path.join(publicDir, "razlom-logo-on-dark.png"), inversePng);

  await copyFile(path.join(brand, "razlom-icon-32.png"), path.join(publicDir, "favicon-32.png"));
  await copyFile(path.join(brand, "razlom-icon-48.png"), path.join(publicDir, "favicon-48.png"));
  await copyFile(path.join(brand, "razlom-icon-180.png"), path.join(publicDir, "apple-touch-icon.png"));

  const icon16 = await sharp(path.join(brand, "razlom-icon-512.png"))
    .resize(16, 16, { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(publicDir, "favicon-16.png"), icon16);

  const ico = icoFromPngs([
    { width: 16, height: 16, buffer: icon16 },
    { width: 32, height: 32, buffer: await sharp(path.join(brand, "razlom-icon-32.png")).png().toBuffer() },
    { width: 48, height: 48, buffer: await sharp(path.join(brand, "razlom-icon-48.png")).png().toBuffer() },
  ]);
  await writeFile(path.join(publicDir, "favicon.ico"), ico);

  console.log(
    JSON.stringify({
      wordmark: { width: wordmark.width, height: wordmark.height, bytes: wordmarkPng.length },
      inverse: { width: inverse.width, height: inverse.height, bytes: inversePng.length },
    }),
  );
}

if (process.argv[1] && process.argv[1].endsWith("build-logo.mjs")) {
  await buildLogo();
}
