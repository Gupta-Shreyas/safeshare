import sharp from "sharp";
import fs from "fs";

const buf = fs.readFileSync("public/logo.png");
const m = await sharp(buf).metadata();
console.log("logo:", m.width + "x" + m.height, m.width === m.height ? "(square, good)" : "(not square, centre-cropped)");
const side = Math.min(m.width, m.height);
const sq = await sharp(buf)
  .extract({ left: Math.floor((m.width - side) / 2), top: Math.floor((m.height - side) / 2), width: side, height: side })
  .toBuffer();
await sharp(sq).resize(720, 720, { withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile("public/logo.tmp.png");
fs.renameSync("public/logo.tmp.png", "public/logo.png");
await sharp(sq).resize(256, 256).png().toFile("src/app/icon.png");
await sharp(sq).resize(180, 180).png().toFile("src/app/apple-icon.png");
console.log("icons done");