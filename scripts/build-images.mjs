import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public", "images");
const rawDir = path.join(root, "tmp", "review");

const sources = {
  old: {
    file: path.join(rawDir, "barn-leskovdol-old.jpg"),
    url: "https://upload.wikimedia.org/wikipedia/commons/1/13/Old-barn-leskovdol.jpg",
  },
  cleared: {
    file: path.join(root, "assets", "photos", "razchisten-teren.jpg"),
  },
  farmBuilding: {
    file: path.join(root, "assets", "photos", "stopanska-predi-sled.jpg"),
  },
  woven: {
    file: path.join(root, "assets", "photos", "plet-kirpich-predi-sled.jpg"),
  },
  detail: {
    file: path.join(rawDir, "chiprovtsi.jpg"),
    url: "https://upload.wikimedia.org/wikipedia/commons/2/28/Montana_Province_-_Chiprovtsi_Municipality_-_Town_of_Chiprovtsi_-_%284%29.jpg",
  },
  interiorPhoto: {
    file: path.join(root, "assets", "photos", "vatreshen-predi-sled.jpg"),
  },
  timber: {
    file: path.join(root, "assets", "photos", "darven-otvor-predi-sled.jpg"),
  },
  roof: {
    file: path.join(root, "assets", "photos", "pokriv-predi-sled.jpg"),
  },
  shed: {
    file: path.join(root, "assets", "photos", "garazh-predi-sled.jpg"),
  },
  wall: {
    file: path.join(root, "assets", "photos", "zid-predi-sled.jpg"),
  },
  wide: {
    file: path.join(root, "assets", "photos", "tuhlena-postroika-predi-sled.jpg"),
  },
  fence: {
    file: path.join(root, "assets", "photos", "ograda-predi-sled.jpg"),
  },
  approach: {
    file: path.join(root, "assets", "photos", "rachen-demontazh.jpg"),
  },
};

const jobs = [
  {
    id: "hero",
    file: "demontazh-stara-postroika",
    source: "old",
    widths: [800, 1280],
    alt: "Стара кирпичена и каменна стопанска постройка с повреден покрив и стена. Илюстративна снимка, не е изпълнен обект.",
  },
  {
    id: "heroAfter",
    file: "razchisten-teren",
    source: "cleared",
    widths: [800, 1024],
    alt: "Разчистен терен с каменна стена, дървета и хълмове. Илюстративна снимка.",
  },
  {
    id: "farm",
    file: "stopanska-predi-sled",
    source: "farmBuilding",
    widths: [819],
    alt: "Преди и след: стара стопанска постройка от камък и тухла с керемиден покрив, и същото място след премахването ѝ.",
  },
  {
    id: "woven",
    file: "plet-kirpich-predi-sled",
    source: "woven",
    widths: [800, 1024],
    alt: "Преди и след: стара плетена стопанска постройка с кирпич и камък, и същото място след премахването ѝ.",
  },
  {
    id: "shed",
    file: "garazh-predi-sled",
    source: "shed",
    widths: [508],
    alt: "Преди и след: малък гараж с дървен покрив и метални врати, и същата постройка след премахване на покрива и вратите.",
  },
  {
    id: "wall",
    file: "zid-predi-sled",
    source: "wall",
    widths: [800, 824],
    alt: "Преди и след: каменна стена с дървена стреха и същото място след събарянето ѝ.",
  },
  {
    id: "approach",
    file: "rachen-demontazh",
    source: "approach",
    widths: [640, 895],
    alt: "Двама работници разбиват каменна стена с кирка и лост при ръчен демонтаж на стара постройка.",
  },
  {
    id: "roof",
    file: "pokriv-predi-sled",
    source: "roof",
    widths: [508],
    alt: "Преди и след: керемиден покрив на стара къща и същата сграда след сваляне на покривната конструкция.",
  },
  {
    id: "timber",
    file: "darven-otvor-predi-sled",
    source: "timber",
    widths: [508],
    alt: "Преди и след: дървена рамка с пълнеж от сено в стената на стара постройка, и същият отвор след премахването на рамката.",
  },
  {
    id: "interior",
    file: "vatreshen-predi-sled",
    source: "interiorPhoto",
    widths: [819],
    alt: "Преди и след: жилищно помещение с преградна стена и старо обзавеждане, и същото помещение след премахването им.",
  },
  {
    id: "wide",
    file: "tuhlena-postroika-predi-sled",
    source: "wide",
    widths: [720, 1024],
    alt: "Преди и след: стара тухлена постройка на два етажа с разкрит покрив, и същото място след премахването ѝ.",
  },
  {
    id: "fence",
    file: "ograda-predi-sled",
    source: "fence",
    widths: [720, 1024],
    alt: "Преди и след: бетонна ограда с декоративни пана и зелена метална врата, и същият двор след премахването ѝ.",
  },
  {
    id: "detail",
    file: "darvena-ramka",
    source: "detail",
    widths: [800, 1400],
    alt: "Детайл от дървена рамка и пълнеж на стара постройка. Илюстративна снимка, не е изпълнен обект.",
  },
];

async function sourceBuffer(key) {
  const item = sources[key];
  try {
    return await readFile(item.file);
  } catch {
    if (!item.url) throw new Error(`Missing local image: ${item.file}`);
    const response = await fetch(item.url, {
      headers: { "user-agent": "DemontSiteBuild/1.0 (image derivative for self-hosting)" },
    });
    if (!response.ok) throw new Error(`Failed to download ${item.url}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}

function cropBox(width, height, extract) {
  if (!extract) return null;
  let left = Math.round(extract.left * width);
  let top = Math.round(extract.top * height);
  let boxWidth = Math.round(extract.width * width);
  let boxHeight = Math.round(extract.height * height);
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + boxWidth > width) boxWidth = width - left;
  if (top + boxHeight > height) boxHeight = height - top;
  boxWidth -= boxWidth % 2;
  boxHeight -= boxHeight % 2;
  return { left, top, width: Math.max(2, boxWidth), height: Math.max(2, boxHeight) };
}

const manifest = {};
await mkdir(outDir, { recursive: true });

for (const job of jobs) {
  const input = await sourceBuffer(job.source);
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const box = cropBox(meta.width, meta.height, job.extract);
  let pipeline = sharp(input, { failOn: "none" }).rotate();
  if (box) pipeline = pipeline.extract(box);
  const cropped = await pipeline.toBuffer();
  const croppedMeta = await sharp(cropped).metadata();
  const avif = [];
  const webp = [];
  let largest = null;

  for (const width of job.widths) {
    if (width > croppedMeta.width) continue;
    const height = Math.round((width * croppedMeta.height) / croppedMeta.width);
    const avifName = `${job.file}-${width}.avif`;
    const webpName = `${job.file}-${width}.webp`;
    const avifQuality = job.id === "hero" ? 38 : 46;
    const webpQuality = job.id === "hero" ? 62 : 70;
    await sharp(cropped).resize(width, height).avif({ quality: avifQuality, effort: 4 }).toFile(path.join(outDir, avifName));
    await sharp(cropped).resize(width, height).webp({ quality: webpQuality }).toFile(path.join(outDir, webpName));
    avif.push(`/images/${avifName} ${width}w`);
    webp.push(`/images/${webpName} ${width}w`);
    largest = { src: `/images/${webpName}`, width, height };
  }

  if (!largest) throw new Error(`No rendition for ${job.id}`);
  manifest[job.id] = {
    id: job.id,
    alt: job.alt,
    width: largest.width,
    height: largest.height,
    src: largest.src,
    avif: avif.join(", "),
    webp: webp.join(", "),
  };
  console.log(job.id, largest.width, largest.height);
}

const hero = manifest.hero;
const heroFile = path.join(outDir, hero.src.replace("/images/", ""));
await sharp(heroFile)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 76, mozjpeg: true })
  .toFile(path.join(root, "public", "og.jpg"));

await sharp(path.join(root, "public", "favicon.svg"))
  .resize(180, 180)
  .png()
  .toFile(path.join(root, "public", "apple-touch-icon.png"));

await writeFile(path.join(root, "src", "data", "photo-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("wrote manifest and social image");
