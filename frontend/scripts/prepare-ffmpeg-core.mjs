import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const coreEntry = fileURLToPath(import.meta.resolve("@ffmpeg/core"));
const sourceDir = dirname(coreEntry);
const targetDir = join(import.meta.dirname, "..", "public", "vendor", "ffmpeg-core");

await mkdir(targetDir, { recursive: true });
await Promise.all([
  copyFile(join(sourceDir, "ffmpeg-core.js"), join(targetDir, "ffmpeg-core.js")),
  copyFile(join(sourceDir, "ffmpeg-core.wasm"), join(targetDir, "ffmpeg-core.wasm")),
]);
