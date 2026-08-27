import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "..");
const nextExportDirectory = resolve(repositoryRoot, "frontend/out");
const hostingFilesDirectory = resolve(repositoryRoot, "infra/dothome/public");
const artifactDirectory = resolve(repositoryRoot, "dist/dothome/public_html");

async function main() {
  try {
    await stat(resolve(nextExportDirectory, "index.html"));
  } catch {
    throw new Error("frontend/out/index.html이 없습니다. 먼저 pnpm build:frontend를 실행하세요.");
  }

  await mkdir(artifactDirectory, { recursive: true });

  const previousEntries = await readdir(artifactDirectory);
  await Promise.all(
    previousEntries.map((entry) =>
      rm(resolve(artifactDirectory, entry), { force: true, recursive: true }),
    ),
  );

  await cp(nextExportDirectory, artifactDirectory, { recursive: true });
  await cp(hostingFilesDirectory, artifactDirectory, { recursive: true });

  console.log(`닷홈 업로드 산출물: ${artifactDirectory}`);
}

void main();
