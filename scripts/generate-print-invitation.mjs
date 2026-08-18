import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import QRCode from "qrcode";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "output", "print");
const temporaryDirectory = resolve(root, "tmp", "print-invitation");
const suppliedUrl = process.argv.find((argument) => argument.startsWith("--url="));

// This is intentionally only a proof destination. Replace it with the deployed
// Vercel address before authorising the artwork for print.
const destinationUrl = suppliedUrl
  ? suppliedUrl.slice("--url=".length)
  : process.env.INVITATION_URL || "https://example.com";

if (!/^https:\/\//.test(destinationUrl)) {
  throw new Error("The invitation URL must begin with https://");
}

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(temporaryDirectory, { recursive: true });

const qr = QRCode.create(destinationUrl, { errorCorrectionLevel: "H" });
const matrix = Array.from({ length: qr.modules.size }, (_, row) =>
  Array.from({ length: qr.modules.size }, (_, column) => Boolean(qr.modules.data[row * qr.modules.size + column])),
);

const configuration = {
  destinationUrl,
  matrix,
  outputPdf: resolve(outputDirectory, "indian-trading-company-spaces-ranchi-invitation-proof.pdf"),
  outputPreview: resolve(outputDirectory, "indian-trading-company-spaces-ranchi-invitation-proof.png"),
  workingDirectory: temporaryDirectory,
  fabricImage: resolve(root, "public", "fabric-ivory-original.jpg"),
};

const configurationPath = resolve(temporaryDirectory, "configuration.json");
writeFileSync(configurationPath, JSON.stringify(configuration, null, 2));

execFileSync(
  process.env.PYTHON || "python",
  [resolve(root, "scripts", "render-print-invitation.py"), configurationPath],
  { stdio: "inherit", cwd: root },
);

console.log(`Created print proof for ${destinationUrl}`);
