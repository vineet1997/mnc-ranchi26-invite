import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(root, "design-history", "opengraph-image-v3-master.jpg");
const outputPath = path.join(root, "public", "spaces-ranchi-preview-v3.jpg");
await sharp(sourcePath)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 74, progressive: true, chromaSubsampling: "4:2:0", mozjpeg: true })
  .toFile(outputPath);

console.log(`Created ${path.relative(root, outputPath)}`);
