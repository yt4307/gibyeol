"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  phpVersion: string;
};

type HealthState =
  | { state: "loading" }
  | { state: "success"; phpVersion: string }
  | { state: "error" };

export function HostingStatus() {
  const [health, setHealth] = useState<HealthState>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health.php", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return (await response.json()) as HealthResponse;
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("PHP health check failed");
        }

        setHealth({ state: "success", phpVersion: response.phpVersion });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setHealth({ state: "error" });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="status-list" aria-live="polite">
      <div className="status-row">
        <span className="status-label">Next.js / Apache</span>
        <span className="status-value" data-state="success">
          정상
        </span>
      </div>
      <div className="status-row">
        <span className="status-label">PHP</span>
        <span className="status-value" data-state={health.state}>
          {health.state === "loading" && "확인 중…"}
          {health.state === "success" && `정상 · ${health.phpVersion}`}
          {health.state === "error" && "연결 실패"}
        </span>
      </div>
    </div>
  );
}
