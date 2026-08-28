import { describe, expect, it } from "vitest";
import {
  TIMELAPSE_FPS,
  TIMELAPSE_MAX_EDGE,
  TIMELAPSE_SPEED,
  timelapseArgs,
} from "./timelapse-transcoder";

describe("timelapse transcoder", () => {
  it("builds a silent 8x WebM conversion with bounded dimensions and frame rate", () => {
    const args = timelapseArgs("input.mp4", "output.webm");

    expect(args).toContain("-an");
    expect(args).toContain("libvpx");
    expect(args).toContain("1M");
    expect(args).toContain(
      `scale=${TIMELAPSE_MAX_EDGE}:${TIMELAPSE_MAX_EDGE}:force_original_aspect_ratio=decrease:force_divisible_by=2,setpts=PTS/${TIMELAPSE_SPEED},fps=${TIMELAPSE_FPS},format=yuv420p`,
    );
    expect(args.at(-1)).toBe("output.webm");
  });
});
