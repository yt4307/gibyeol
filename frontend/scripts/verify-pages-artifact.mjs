import { access, readFile } from "node:fs/promises";

const outputDirectory = new URL("../out/", import.meta.url);
const requiredFiles = [
  "index.html",
  "favicon.ico",
  "send/index.html",
  "inbox/index.html",
  "manifest.webmanifest",
  "icons/pwa-192x192.png",
  "icons/pwa-512x512.png",
  ".nojekyll",
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, outputDirectory))));

const home = await readFile(new URL("index.html", outputDirectory), "utf8");
const references = [...home.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

if (!references.includes("/send/")) {
  throw new Error("홈의 기별 보내기 링크가 custom domain root의 /send/를 가리키지 않습니다.");
}

if (!references.some((reference) => reference.startsWith("/_next/"))) {
  throw new Error("Next.js asset이 custom domain root의 /_next/를 가리키지 않습니다.");
}

const repositoryPathReference = references.find((reference) => reference.startsWith("/gibyeol/"));

if (repositoryPathReference) {
  throw new Error(`repository base path가 custom domain 산출물에 남아 있습니다: ${repositoryPathReference}`);
}

if (!references.includes("/manifest.webmanifest")) {
  throw new Error("PWA manifest가 custom domain root 경로로 연결되지 않았습니다.");
}

const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", outputDirectory), "utf8"));

if (manifest.start_url !== "/" || manifest.scope !== "/") {
  throw new Error("PWA 시작 경로와 scope가 custom domain root를 가리키지 않습니다.");
}

const expectedPwaIcons = ["/icons/pwa-192x192.png", "/icons/pwa-512x512.png"];
const manifestIcons = (manifest.icons ?? []).map((icon) => icon.src);

for (const icon of expectedPwaIcons) {
  if (!manifestIcons.includes(icon)) {
    throw new Error(`PWA manifest 아이콘이 누락되었습니다: ${icon}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  routes: ["/", "/send/", "/inbox/"],
  basePath: "",
  pwa: true,
}, null, 2));
