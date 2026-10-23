import sharp from "sharp";

const src = "../logo-backup/logo-original.png";
const meta = await sharp(src).metadata();
console.log("original:", meta.width + "x" + meta.height);

// 1. Website logo: max 720 px, compressed
await sharp(src)
  .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9, quality: 90, palette: true })
  .toFile("public/logo.png");

// 2. Favicon and phone icon: crop just the emblem, the same area the app header shows
const W = meta.width;
const left = Math.round(W * 0.246);
const top = Math.round(W * 0.107);
const size = Math.max(16, Math.min(Math.round(W * 0.508), meta.width - left, meta.height - top));
const emblem = await sharp(src).extract({ left, top, width: size, height: size }).toBuffer();

await sharp(emblem).resize(256, 256).png({ compressionLevel: 9 }).toFile("src/app/icon.png");
await sharp(emblem).resize(180, 180).png({ compressionLevel: 9 }).toFile("src/app/apple-icon.png");
console.log("done");