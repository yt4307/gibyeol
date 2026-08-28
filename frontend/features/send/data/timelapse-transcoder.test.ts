import { describe, expect, it, vi } from "vitest";
import {
  TIMELAPSE_BITRATE,
  TIMELAPSE_FPS,
  TIMELAPSE_MAX_EDGE,
  TIMELAPSE_SPEED,
  fitTimelapseDimensions,
  timelapseArgs,
  transcodeWithFallback,
} from "./timelapse-transcoder";

describe("timelapse transcoder", () => {
  it("builds a silent 8x WebM conversion with bounded dimensions and frame rate", () => {
    const args = timelapseArgs("input.mp4", "output.webm");

    expect(args).toContain("-an");
    expect(args).toContain("libvpx");
    expect(args).toContain(String(TIMELAPSE_BITRATE));
    expect(args).toContain(
      `scale=${TIMELAPSE_MAX_EDGE}:${TIMELAPSE_MAX_EDGE}:force_original_aspect_ratio=decrease:force_divisible_by=2,setpts=PTS/${TIMELAPSE_SPEED},fps=${TIMELAPSE_FPS},format=yuv420p`,
    );
    expect(args.at(-1)).toBe("output.webm");
  });

  it("fits landscape and portrait videos inside an even 1,280px edge", () => {
    expect(fitTimelapseDimensions(1_920, 1_080)).toEqual({ width: 1_280, height: 720 });
    expect(fitTimelapseDimensions(1_080, 1_920)).toEqual({ width: 720, height: 1_280 });
    expect(fitTimelapseDimensions(640, 359)).toEqual({ width: 640, height: 358 });
  });

  it("prefers WebCodecs and falls back to ffmpeg.wasm when unavailable or rejected", async () => {
    const file = new File([new Uint8Array(1)], "clip.mp4", { type: "video/mp4" });
    const webResult = { blob: new Blob(["web"], { type: "video/webm" }), backend: "webcodecs" as const };
    const ffmpegResult = { blob: new Blob(["wasm"], { type: "video/webm" }), backend: "ffmpeg-wasm" as const };
    const webCodecs = vi.fn().mockResolvedValue(webResult);
    const ffmpeg = vi.fn().mockResolvedValue(ffmpegResult);

    await expect(transcodeWithFallback(file, {
      webCodecsSupported: true,
      transcodeWithWebCodecs: webCodecs,
      transcodeWithFfmpeg: ffmpeg,
    })).resolves.toBe(webResult);
    expect(ffmpeg).not.toHaveBeenCalled();

    webCodecs.mockRejectedValueOnce(new Error("unsupported codec"));
    await expect(transcodeWithFallback(file, {
      webCodecsSupported: true,
      transcodeWithWebCodecs: webCodecs,
      transcodeWithFfmpeg: ffmpeg,
    })).resolves.toBe(ffmpegResult);
    await expect(transcodeWithFallback(file, {
      webCodecsSupported: false,
      transcodeWithWebCodecs: webCodecs,
      transcodeWithFfmpeg: ffmpeg,
    })).resolves.toBe(ffmpegResult);
  });
});
