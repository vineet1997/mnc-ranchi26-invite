import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const backgroundPath = path.join(root, "design-history", "opengraph-background-v2.jpg");
const outputPath = path.join(root, "app", "opengraph-image.jpg");
const displayFontPath = path.join(
  root,
  "node_modules",
  "@fontsource",
  "cormorant-garamond",
  "files",
  "cormorant-garamond-latin-500-normal.woff2",
);
const displayItalicFontPath = path.join(
  root,
  "node_modules",
  "@fontsource",
  "cormorant-garamond",
  "files",
  "cormorant-garamond-latin-500-italic.woff2",
);
const sansFontPath = path.join(
  root,
  "node_modules",
  "@fontsource-variable",
  "manrope",
  "files",
  "manrope-latin-wght-normal.woff2",
);

const [displayFont, displayItalicFont, sansFont] = await Promise.all([
  fs.readFile(displayFontPath),
  fs.readFile(displayItalicFontPath),
  fs.readFile(sansFontPath),
]);

const fontFace = (name, data, options = "") => `
  @font-face {
    font-family: '${name}';
    src: url(data:font/woff2;base64,${data.toString("base64")}) format('woff2');
    ${options}
  }
`;

const spaces = [
  ["S", "#8f2d28"],
  ["P", "#ac6561"],
  ["A", "#b94e45"],
  ["C", "#ad6040"],
  ["E", "#765239"],
  ["S", "#4e2b26"],
];

const tileSize = 31;
const tileGap = 5;
const tiles = spaces
  .map(([letter, color], index) => {
    const x = 847 + index * (tileSize + tileGap);
    return `
      <rect x="${x}" y="66" width="${tileSize}" height="${tileSize}" fill="${color}" />
      <text x="${x + tileSize / 2}" y="89" class="space-letter" text-anchor="middle">${letter}</text>
    `;
  })
  .join("");

const overlay = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${fontFace("Cormorant", displayFont, "font-weight: 500; font-style: normal;")}
    ${fontFace("Cormorant", displayItalicFont, "font-weight: 500; font-style: italic;")}
    ${fontFace("Manrope", sansFont, "font-weight: 200 800;")}
    .display { font-family: 'Cormorant', Georgia, serif; fill: #241813; }
    .sans { font-family: 'Manrope', Arial, sans-serif; }
    .space-letter { font-family: Georgia, serif; font-size: 19px; fill: #fffaf3; }
  </style>

  <rect width="1200" height="630" fill="#f3ece2" fill-opacity="0.09" />
  <rect x="0" y="0" width="735" height="630" fill="url(#readingLight)" />
  <defs>
    <linearGradient id="readingLight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f8f2e9" stop-opacity="0.46" />
      <stop offset="0.76" stop-color="#f8f2e9" stop-opacity="0.13" />
      <stop offset="1" stop-color="#f8f2e9" stop-opacity="0" />
    </linearGradient>
  </defs>

  <text x="64" y="98" class="display" font-size="50" letter-spacing="-1.3">Mukesh <tspan fill="#ac7a3c" font-style="italic">&amp;</tspan> Company</text>
  ${tiles}

  <line x1="64" y1="143" x2="105" y2="143" stroke="#ae7d3e" stroke-width="2" />
  <text x="123" y="150" class="sans" font-size="15" font-weight="700" letter-spacing="3.4" fill="#8f352f">SPACES CONFERENCE</text>
  <text x="398" y="150" class="sans" font-size="14" font-weight="600" letter-spacing="2.6" fill="#76675f">RANCHI · 2026</text>

  <text x="64" y="263" class="display" font-size="70" letter-spacing="-2.1">A new chapter unfolds</text>
  <text x="64" y="325" class="display" font-size="59" font-style="italic" letter-spacing="-1.4" fill="#9e4035">in Jharkhand.</text>

  <line x1="64" y1="376" x2="560" y2="376" stroke="#6f5547" stroke-opacity="0.25" />

  <text x="64" y="419" class="sans" font-size="12" font-weight="700" letter-spacing="2.2" fill="#76675f">DATE</text>
  <text x="64" y="453" class="display" font-size="31">23 August 2026</text>

  <text x="292" y="419" class="sans" font-size="12" font-weight="700" letter-spacing="2.2" fill="#76675f">TIME</text>
  <text x="292" y="453" class="display" font-size="31">3:00 PM onwards</text>

  <text x="64" y="511" class="sans" font-size="12" font-weight="700" letter-spacing="2.2" fill="#76675f">VENUE</text>
  <text x="64" y="548" class="display" font-size="34">Chanakya BNR, Ranchi</text>

  <text x="64" y="593" class="sans" font-size="12" font-weight="650" letter-spacing="2.1" fill="#5e5048">DISCOVER · CONNECT · GROW TOGETHER</text>
</svg>`;

await sharp(backgroundPath)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .modulate({ saturation: 0.78, brightness: 1.01 })
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 76, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true })
  .toFile(outputPath);

const { size = 0 } = await fs.stat(outputPath);
console.log(`Created ${path.relative(root, outputPath)} (${Math.round(size / 1024)} KB)`);
