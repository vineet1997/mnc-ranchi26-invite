import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(root, "design-history", "opengraph-image-v4-background.jpg");
const outputPath = path.join(root, "public", "spaces-ranchi-preview-v4.jpg");
const displayFontPath = path.join(
  root,
  "node_modules",
  "@fontsource",
  "cormorant-garamond",
  "files",
  "cormorant-garamond-latin-600-normal.woff2",
);

const displayFont = await fs.readFile(displayFontPath);
const textLayer = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <style>
      @font-face {
        font-family: 'Cormorant';
        src: url(data:font/woff2;base64,${displayFont.toString("base64")}) format('woff2');
        font-weight: 600;
      }
    </style>
    <text x="25" y="75" fill="#241813" font-family="Cormorant, Georgia, serif" font-size="28" font-weight="600" letter-spacing="0.22">Indian Trading Company</text>
  </svg>
`;

await sharp(sourcePath)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .composite([{ input: Buffer.from(textLayer) }])
  .jpeg({ quality: 74, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true })
  .toFile(outputPath);

console.log(`Created ${path.relative(root, outputPath)}`);
