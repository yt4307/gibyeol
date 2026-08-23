import { PROTOCOL_VERSION } from "@gibyeol/protocol";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">GIBYEOL · PROTOCOL V{PROTOCOL_VERSION}</p>
      <h1>기별 개발 환경</h1>
      <p>2026년 크리스마스에 도착하는 암호 편지를 준비하고 있습니다.</p>
      <dl>
        <div>
          <dt>Frontend</dt>
          <dd>Next.js static export</dd>
        </div>
        <div>
          <dt>Backend</dt>
          <dd>Symfony 7.4 LTS</dd>
        </div>
        <div>
          <dt>Local chain</dt>
          <dd>Anvil 31337</dd>
        </div>
      </dl>
    </main>
  );
}
