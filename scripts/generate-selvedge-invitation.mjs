import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import QRCode from "qrcode";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "output", "print");
const temporaryDirectory = resolve(root, "tmp", "selvedge-invitation");
const suppliedUrl = process.argv.find((argument) => argument.startsWith("--url="));
const destinationUrl = suppliedUrl
  ? suppliedUrl.slice("--url=".length)
  : process.env.INVITATION_URL;

if (!destinationUrl || !/^https:\/\//.test(destinationUrl)) {
  throw new Error("Set INVITATION_URL or pass --url=https://your-live-invitation-url");
}

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(temporaryDirectory, { recursive: true });

const qr = QRCode.create(destinationUrl, { errorCorrectionLevel: "H" });
const matrix = Array.from({ length: qr.modules.size }, (_, row) =>
  Array.from(
    { length: qr.modules.size },
    (_, column) => Boolean(qr.modules.data[row * qr.modules.size + column]),
  ),
);

const configurationPath = resolve(temporaryDirectory, "configuration.json");
writeFileSync(
  configurationPath,
  JSON.stringify({
    destinationUrl,
    matrix,
    output: resolve(outputDirectory, "indian-trading-company-spaces-ranchi-invitation-selvedge-concept-v2.png"),
  }),
);

execFileSync(
  process.env.PYTHON || "python",
  [resolve(root, "scripts", "render-selvedge-qr-concept.py"), configurationPath],
  { cwd: root, stdio: "inherit" },
);

console.log(`Created functional selvedge invitation for ${destinationUrl}`);
