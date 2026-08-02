import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = join(projectRoot, "public", "ocr-runtime", "v7");
const coreTarget = join(runtimeRoot, "core");
const languageTarget = join(runtimeRoot, "languages");

await Promise.all([
  mkdir(coreTarget, { recursive: true }),
  mkdir(languageTarget, { recursive: true }),
]);

const files = [
  [join(projectRoot, "node_modules", "tesseract.js", "dist", "worker.min.js"), join(runtimeRoot, "worker.min.js")],
  ...[
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ].map((file) => [join(projectRoot, "node_modules", "tesseract.js-core", file), join(coreTarget, file)]),
  [join(projectRoot, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int", "eng.traineddata.gz"), join(languageTarget, "eng.traineddata.gz")],
  // The Thai best_int bundle embeds four parameters removed from Tesseract 5,
  // which makes successful OCR jobs emit error-level console noise. The full
  // 4.0.0 bundle is only ~8 KB larger and avoids those obsolete parameters.
  [join(projectRoot, "node_modules", "@tesseract.js-data", "tha", "4.0.0", "tha.traineddata.gz"), join(languageTarget, "tha.traineddata.gz")],
];

await Promise.all(files.map(([source, target]) => copyFile(source, target)));

console.log(`Copied OCR runtime and Thai/English language data to ${runtimeRoot}`);
