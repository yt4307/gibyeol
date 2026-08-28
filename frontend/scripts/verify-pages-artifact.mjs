import { access, readFile } from "node:fs/promises";

const outputDirectory = new URL("../out/", import.meta.url);
const requiredFiles = ["index.html", "send/index.html", "inbox/index.html", ".nojekyll"];

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

console.log(JSON.stringify({
  ok: true,
  routes: ["/", "/send/", "/inbox/"],
  basePath: "",
}, null, 2));
