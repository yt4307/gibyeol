export const TIMELAPSE_SPEED = 8;
export const TIMELAPSE_MAX_EDGE = 1_280;
export const TIMELAPSE_FPS = 24;
export const MAX_VIDEO_SOURCE_BYTES = 200 * 1_024 * 1_024;
export const TIMELAPSE_TIMEOUT_MS = 5 * 60 * 1_000;

export interface TimelapseTranscoder {
  transcode(file: File): Promise<Blob>;
}

export function timelapseArgs(inputPath: string, outputPath: string) {
  return [
    "-i", inputPath,
    "-map", "0:v:0",
    "-an",
    "-vf", `scale=${TIMELAPSE_MAX_EDGE}:${TIMELAPSE_MAX_EDGE}:force_original_aspect_ratio=decrease:force_divisible_by=2,setpts=PTS/${TIMELAPSE_SPEED},fps=${TIMELAPSE_FPS},format=yuv420p`,
    "-c:v", "libvpx",
    "-deadline", "realtime",
    "-cpu-used", "8",
    "-crf", "36",
    "-b:v", "1M",
    outputPath,
  ];
}

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function loadSingleThreadFfmpeg() {
  if (typeof window === "undefined") {
    throw new Error("타임랩스 변환은 브라우저에서만 사용할 수 있습니다.");
  }
  if (!ffmpegPromise) {
    ffmpegPromise = import("@ffmpeg/ffmpeg").then(async ({ FFmpeg }) => {
      const ffmpeg = new FFmpeg();
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const coreBaseUrl = `${basePath}/vendor/ffmpeg-core`;
      await ffmpeg.load({
        coreURL: `${coreBaseUrl}/ffmpeg-core.js`,
        wasmURL: `${coreBaseUrl}/ffmpeg-core.wasm`,
      });
      return ffmpeg;
    }).catch((cause) => {
      ffmpegPromise = null;
      throw cause;
    });
  }
  return ffmpegPromise;
}

function inputExtension(file: File) {
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

export const browserTimelapseTranscoder: TimelapseTranscoder = {
  async transcode(file) {
    if (file.size > MAX_VIDEO_SOURCE_BYTES) {
      throw new RangeError(`${file.name}: 원본 영상은 200 MiB 이하여야 합니다.`);
    }

    const [{ fetchFile }, ffmpeg] = await Promise.all([
      import("@ffmpeg/util"),
      loadSingleThreadFfmpeg(),
    ]);
    const inputPath = `timelapse-input.${inputExtension(file)}`;
    const outputPath = "timelapse-output.webm";
    try {
      await ffmpeg.writeFile(inputPath, await fetchFile(file));
      const exitCode = await ffmpeg.exec(
        timelapseArgs(inputPath, outputPath),
        TIMELAPSE_TIMEOUT_MS,
      );
      if (exitCode !== 0) throw new Error(`${file.name}: 타임랩스 변환에 실패했습니다.`);
      const output = await ffmpeg.readFile(outputPath);
      if (!(output instanceof Uint8Array) || output.byteLength === 0) {
        throw new Error(`${file.name}: 변환된 타임랩스가 비어 있습니다.`);
      }
      const bytes = new Uint8Array(output.byteLength);
      bytes.set(output);
      return new Blob([bytes.buffer], { type: "video/webm" });
    } finally {
      await Promise.allSettled([
        ffmpeg.deleteFile(inputPath),
        ffmpeg.deleteFile(outputPath),
      ]);
    }
  },
};
