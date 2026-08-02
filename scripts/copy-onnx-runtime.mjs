import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(projectRoot, "node_modules", "onnxruntime-web", "dist");
const targetDirectory = join(projectRoot, "public", "ai-runtime", "v1.22.0");
const runtimeFiles = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

await mkdir(targetDirectory, { recursive: true });
await Promise.all(runtimeFiles.map((file) => copyFile(join(sourceDirectory, file), join(targetDirectory, file))));

console.log(`Copied ONNX Runtime Web assets to ${targetDirectory}`);
