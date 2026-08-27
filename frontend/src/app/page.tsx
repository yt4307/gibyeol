import { HostingStatus } from "./hosting-status";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">GIBYEOL · HOSTING SMOKE TEST</p>
      <h1>기별이 도착했습니다.</h1>
      <p className="description">
        이 화면이 보이면 Next.js 정적 파일을 Apache가 정상적으로 제공하고 있습니다.
      </p>
      <HostingStatus />
    </main>
  );
}
