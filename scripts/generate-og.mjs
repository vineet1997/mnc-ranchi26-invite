import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const fabricPath = path.join(root, "public", "fabric-ivory-original.jpg");
const outputPath = path.join(root, "public", "spaces-ranchi-preview-v4.jpg");
const displayNormalPath = path.join(root, "node_modules", "@fontsource", "cormorant-garamond", "files", "cormorant-garamond-latin-600-normal.woff2");
const displayItalicPath = path.join(root, "node_modules", "@fontsource", "cormorant-garamond", "files", "cormorant-garamond-latin-600-italic.woff2");
const sansPath = path.join(root, "node_modules", "@fontsource-variable", "manrope", "files", "manrope-latin-wght-normal.woff2");

const [displayNormal, displayItalic, sans] = await Promise.all([
  fs.readFile(displayNormalPath),
  fs.readFile(displayItalicPath),
  fs.readFile(sansPath),
]);

const spacesTiles = ["#731D1B", "#A54D54", "#CC6871", "#C66F4D", "#B57B55", "#4A2A22"];
const spacesMark = [..."SPACES"].map((letter, index) => `<rect x="${492 + index * 42}" y="55" width="39" height="39" fill="${spacesTiles[index]}" />\n<text x="${511.5 + index * 42}" y="81" text-anchor="middle" class="space-letter">${letter}</text>`).join("");

const textLayer = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <style>
      @font-face { font-family: 'Cormorant'; src: url(data:font/woff2;base64,${displayNormal.toString("base64")}) format('woff2'); font-style: normal; font-weight: 600; }
      @font-face { font-family: 'Cormorant'; src: url(data:font/woff2;base64,${displayItalic.toString("base64")}) format('woff2'); font-style: italic; font-weight: 600; }
      @font-face { font-family: 'Manrope'; src: url(data:font/woff2;base64,${sans.toString("base64")}) format('woff2'); }
      .display { font-family: 'Cormorant', Georgia, serif; fill: #241813; }
      .accent { fill: #9a4235; }
      .meta { font-family: 'Manrope', Arial, sans-serif; fill: #4b3930; font-weight: 700; letter-spacing: 2.6px; }
      .space-letter { font-family: 'Manrope', Arial, sans-serif; fill: #fffdf8; font-size: 18px; font-weight: 700; }
    </style>
    <rect width="1200" height="630" fill="#f8f3ea" fill-opacity="0.42" />
    <rect width="680" height="630" fill="#faf6ef" fill-opacity="0.19" />
    <text x="56" y="84" class="display" font-size="34">Indian Trading Company</text>
    <line x1="430" y1="69" x2="472" y2="69" stroke="#ae7d3e" stroke-width="1.5" />
    ${spacesMark}
    <text x="56" y="230" class="display" font-size="101">A new chapter</text>
    <text x="62" y="315" class="display accent" font-size="104" font-style="italic">unfolds.</text>
    <line x1="56" y1="355" x2="105" y2="355" stroke="#ae7d3e" stroke-width="1.5" />
    <text x="126" y="362" class="meta" font-size="15">RANCHI · 2026</text>
    <rect x="56" y="417" width="662" height="138" fill="#fbf7ef" fill-opacity="0.76" stroke="#bda991" stroke-opacity="0.72" />
    <line x1="228" y1="438" x2="228" y2="534" stroke="#9b8066" stroke-opacity="0.72" />
    <line x1="432" y1="438" x2="432" y2="534" stroke="#9b8066" stroke-opacity="0.72" />
    <text x="84" y="452" class="meta" font-size="12">DATE</text>
    <text x="84" y="499" class="display" font-size="40">25 Aug</text>
    <text x="84" y="526" class="meta" font-size="11">TUESDAY</text>
    <text x="256" y="452" class="meta" font-size="12">TIME</text>
    <text x="256" y="499" class="display" font-size="40">6:00 PM</text>
    <text x="256" y="526" class="meta" font-size="11">ONWARDS</text>
    <text x="460" y="452" class="meta" font-size="12">VENUE</text>
    <text x="460" y="489" class="display" font-size="31">Lemon Tree Hotel</text>
    <text x="460" y="518" class="meta" font-size="9.5">CONFERENCE HALL, 7TH FLOOR</text>
  </svg>
`;

await sharp(fabricPath)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .modulate({ brightness: 1.12, saturation: 0.42 })
  .composite([{ input: Buffer.from(textLayer) }])
  .jpeg({ quality: 76, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true })
  .toFile(outputPath);

console.log(`Created ${path.relative(root, outputPath)}`);
