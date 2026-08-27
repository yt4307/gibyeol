import { readFile } from "node:fs/promises";

const manifestPath = process.argv[2];
const production = process.argv.includes("--production");
if (!manifestPath) throw new Error("사용법: node scripts/validate-deployment-manifest.mjs <manifest.json> [--production]");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const address = /^0x[0-9a-fA-F]{40}$/;
const txHash = /^0x[0-9a-fA-F]{64}$/;
const commit = /^[0-9a-f]{40}$/;

expect(["local", "staging", "production"].includes(manifest.environment), "environment가 올바르지 않습니다.");
expect(/^https:\/\//.test(manifest.webOrigin ?? ""), "webOrigin은 HTTPS여야 합니다.");
expect(/^https:\/\//.test(manifest.apiOrigin ?? "") || (!production && manifest.apiOrigin === ""), "apiOrigin은 HTTPS여야 합니다.");
expect(Number.isInteger(manifest.chainId), "chainId가 필요합니다.");
expect(manifest.contractAddress === "" || address.test(manifest.contractAddress), "contractAddress 형식이 올바르지 않습니다.");
expect(manifest.deploymentTxHash === "" || txHash.test(manifest.deploymentTxHash), "deploymentTxHash 형식이 올바르지 않습니다.");
expect(manifest.drandChainHash === "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971", "Quicknet chain hash가 고정값과 다릅니다.");
expect(manifest.unlockAt === 1_798_124_400, "UNLOCK_AT이 고정값과 다릅니다.");
expect(Number.isInteger(manifest.unlockRound) && manifest.unlockRound > 1, "unlockRound가 올바르지 않습니다.");
const roundTime = 1_692_803_367 + (manifest.unlockRound - 1) * 3;
const previousRoundTime = roundTime - 3;
expect(roundTime >= manifest.unlockAt && previousRoundTime < manifest.unlockAt, "unlock round 경계가 UNLOCK_AT을 감싸지 않습니다.");

if (production) {
  expect(manifest.environment === "production", "production manifest만 --production으로 검증할 수 있습니다.");
  expect(manifest.chainId === 8_453, "production chainId는 Base Mainnet 8453이어야 합니다.");
  expect(address.test(manifest.contractAddress ?? ""), "production contractAddress가 필요합니다.");
  expect(txHash.test(manifest.deploymentTxHash ?? ""), "production deploymentTxHash가 필요합니다.");
  expect(commit.test(manifest.frontendCommit ?? "") && commit.test(manifest.backendCommit ?? ""), "배포 commit SHA 두 개가 필요합니다.");
  expect(/^https:\/\//.test(manifest.explorerVerificationUrl ?? ""), "explorer source verification URL이 필요합니다.");
  expect(/^https:\/\//.test(manifest.pagesUrl ?? ""), "production Pages URL이 필요합니다.");
  expect(Array.isArray(manifest.approvals) && manifest.approvals.length >= 2, "서로 다른 두 명의 승인이 필요합니다.");
  const approvers = new Set((manifest.approvals ?? []).map((approval) => approval.name));
  expect(approvers.size >= 2 && (manifest.approvals ?? []).every((approval) => approval.approvedAt && approval.scope), "승인자·시각·범위를 기록해야 합니다.");
  expect(manifest.owners?.monitoring && manifest.owners?.backup && manifest.owners?.incident, "monitoring, backup, incident owner가 필요합니다.");
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, environment: manifest.environment, roundTime, previousRoundTime }, null, 2));
}
