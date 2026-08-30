import { describe, expect, it, vi } from "vitest";
import { MAX_ARCHIVE_BYTES, MEDIA_CODEC, MEDIA_TYPE } from "@gibyeol/protocol";
import {
  assertArchiveSize,
  estimateGbylBytes,
  fitImageDimensions,
  formatMediaBytes,
  preprocessMediaFiles,
  type DecodedImage,
  type MediaPreprocessorRuntime,
} from "./media-preprocessing";

function runtime(overrides: Partial<MediaPreprocessorRuntime> = {}): MediaPreprocessorRuntime {
  return {
    decodeImage: vi.fn().mockResolvedValue({
      width: 4_000,
      height: 2_000,
      source: {} as CanvasImageSource,
      close: vi.fn(),
    } satisfies DecodedImage),
    encodeImage: vi.fn().mockResolvedValue(new Blob([new Uint8Array(20)], { type: "image/webp" })),
    canPlayVideo: vi.fn().mockReturnValue(true),
    transcodeVideo: vi.fn().mockResolvedValue({
      blob: new Blob([new Uint8Array(6)], { type: "video/webm" }),
      backend: "webcodecs",
    }),
    ...overrides,
  };
}

describe("media preprocessing", () => {
  it("fits large images inside 2,048px while preserving aspect ratio", () => {
    expect(fitImageDimensions(4_000, 2_000)).toEqual({ width: 2_048, height: 1_024, resized: true });
    expect(fitImageDimensions(800, 600)).toEqual({ width: 800, height: 600, resized: false });
    expect(() => fitImageDimensions(10_000, 5_000)).toThrow("4천만 픽셀");
  });

  it("converts a resized PNG to WebP and reports the final archive estimate", async () => {
    const adapter = runtime();
    const source = new File([new Uint8Array(100)], "photo.png", { type: "image/png" });
    const result = await preprocessMediaFiles([source], adapter);

    expect(adapter.encodeImage).toHaveBeenCalledWith(
      expect.anything(), 2_048, 1_024, "image/webp", 0.82,
    );
    expect(result.items[0]).toMatchObject({ type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.WEBP });
    expect(result.items[0]?.bytes).toHaveLength(20);
    expect(result.summary).toEqual({
      originalBytes: 100,
      processedBytes: 20,
      estimatedArchiveBytes: 64,
      convertedImages: 1,
      convertedVideos: 0,
      webCodecsVideos: 0,
      ffmpegVideos: 0,
    });
  });

  it("keeps a smaller supported original and falls back to JPEG when WebP is unavailable", async () => {
    const close = vi.fn();
    const adapter = runtime({
      decodeImage: vi.fn().mockResolvedValue({ width: 100, height: 100, source: {} as CanvasImageSource, close }),
      encodeImage: vi.fn()
        .mockResolvedValueOnce(new Blob([new Uint8Array(1)], { type: "image/png" }))
        .mockResolvedValueOnce(new Blob([new Uint8Array(20)], { type: "image/jpeg" })),
    });
    const source = new File([new Uint8Array(10)], "photo.webp", { type: "image/webp" });
    const result = await preprocessMediaFiles([source], adapter);

    expect(result.items[0]).toMatchObject({ codec: MEDIA_CODEC.WEBP });
    expect(result.items[0]?.bytes).toHaveLength(10);
    expect(result.summary.convertedImages).toBe(0);
    expect(close).toHaveBeenCalledOnce();
  });

  it("converts supported source videos to WebM and rejects an unsupported browser output", async () => {
    const video = new File([new Uint8Array(10)], "clip.mov", { type: "video/quicktime" });
    const adapter = runtime();
    await expect(preprocessMediaFiles([video], adapter)).resolves.toMatchObject({
      items: [{ type: MEDIA_TYPE.TIMELAPSE, codec: MEDIA_CODEC.WEBM }],
      summary: {
        originalBytes: 10,
        processedBytes: 6,
        convertedVideos: 1,
        webCodecsVideos: 1,
        ffmpegVideos: 0,
      },
    });
    expect(adapter.transcodeVideo).toHaveBeenCalledWith(video);
    await expect(preprocessMediaFiles([video], runtime({ canPlayVideo: () => false }))).rejects.toThrow(
      "WebM 타임랩스를 재생할 수 없습니다",
    );
  });

  it("accounts for GBYL encryption overhead at the exact 10MB boundary", () => {
    expect(estimateGbylBytes([])).toBe(8);
    expect(assertArchiveSize([{ bytes: new Uint8Array(MAX_ARCHIVE_BYTES - 44) }])).toBe(MAX_ARCHIVE_BYTES);
    expect(() => assertArchiveSize([{ bytes: new Uint8Array(MAX_ARCHIVE_BYTES - 43) }])).toThrow("10MB");
    expect(formatMediaBytes(MAX_ARCHIVE_BYTES)).toBe("10.00MB");
  });
});
