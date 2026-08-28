export const TIMELAPSE_SPEED = 8;
export const TIMELAPSE_MAX_EDGE = 1_280;
export const TIMELAPSE_FPS = 24;
export const MAX_VIDEO_SOURCE_BYTES = 200 * 1_024 * 1_024;
export const TIMELAPSE_TIMEOUT_MS = 5 * 60 * 1_000;
export const TIMELAPSE_BITRATE = 1_000_000;

export type TimelapseBackend = "webcodecs" | "ffmpeg-wasm";

export interface TimelapseTranscodeResult {
  blob: Blob;
  backend: TimelapseBackend;
}

export interface TimelapseTranscoder {
  transcode(file: File): Promise<TimelapseTranscodeResult>;
}

export interface TimelapseFallbackOptions {
  webCodecsSupported: boolean;
  transcodeWithWebCodecs(file: File): Promise<TimelapseTranscodeResult>;
  transcodeWithFfmpeg(file: File): Promise<TimelapseTranscodeResult>;
}

export function fitTimelapseDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("영상 크기가 올바르지 않습니다.");
  }
  const scale = Math.min(1, TIMELAPSE_MAX_EDGE / Math.max(width, height));
  const even = (value: number) => Math.max(2, Math.floor(value * scale / 2) * 2);
  return { width: even(width), height: even(height) };
}

export function webCodecsRuntimeAvailable() {
  return typeof VideoDecoder !== "undefined"
    && typeof VideoEncoder !== "undefined"
    && typeof VideoFrame !== "undefined";
}

export async function transcodeWithFallback(file: File, options: TimelapseFallbackOptions) {
  if (options.webCodecsSupported) {
    try {
      return await options.transcodeWithWebCodecs(file);
    } catch {
      // 입력 codec이나 하드웨어 encoder가 실제 실행 중 거부될 수 있어 WASM으로 재시도한다.
    }
  }
  return options.transcodeWithFfmpeg(file);
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
    "-b:v", String(TIMELAPSE_BITRATE),
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

const ffmpegTimelapseTranscoder: TimelapseTranscoder = {
  async transcode(file) {
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
      return {
        blob: new Blob([bytes.buffer], { type: "video/webm" }),
        backend: "ffmpeg-wasm",
      };
    } finally {
      await Promise.allSettled([
        ffmpeg.deleteFile(inputPath),
        ffmpeg.deleteFile(outputPath),
      ]);
    }
  },
};

function* sampleTimestamps(start: number, end: number) {
  const interval = TIMELAPSE_SPEED / TIMELAPSE_FPS;
  for (let timestamp = start; timestamp < end; timestamp += interval) yield timestamp;
}

async function transcodeWithWebCodecs(file: File): Promise<TimelapseTranscodeResult> {
  const {
    BlobSource,
    BufferTarget,
    Input,
    MP4,
    Output,
    QTFF,
    Quality,
    VideoSampleSink,
    VideoSampleSource,
    WEBM,
    WebMOutputFormat,
    canEncodeVideo,
  } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, WEBM] });
  const target = new BufferTarget();
  const output = new Output({ format: new WebMOutputFormat(), target });
  let source: InstanceType<typeof VideoSampleSource> | null = null;
  try {
    if (!await input.canRead()) throw new Error(`${file.name}: 영상 컨테이너를 읽을 수 없습니다.`);
    const track = await input.getPrimaryVideoTrack();
    if (!track || !await track.canDecode()) {
      throw new Error(`${file.name}: WebCodecs에서 원본 codec을 디코딩할 수 없습니다.`);
    }
    const dimensions = fitTimelapseDimensions(
      await track.getDisplayWidth(),
      await track.getDisplayHeight(),
    );
    if (!await canEncodeVideo("vp8", {
      width: dimensions.width,
      height: dimensions.height,
      bitrate: TIMELAPSE_BITRATE,
    })) {
      throw new Error(`${file.name}: WebCodecs VP8 encoder를 사용할 수 없습니다.`);
    }

    source = new VideoSampleSource({
      codec: "vp8",
      quality: new Quality({ bitrate: TIMELAPSE_BITRATE }),
      keyFrameInterval: 2,
      transform: {
        width: dimensions.width,
        height: dimensions.height,
        fit: "fill",
        alpha: "discard",
      },
    });
    output.addVideoTrack(source, { frameRate: TIMELAPSE_FPS });
    await output.start();

    const firstTimestamp = Math.max(0, await track.getFirstTimestamp());
    const endTimestamp = await input.computeDuration([track]);
    const sink = new VideoSampleSink(track, { hardwareAcceleration: "prefer-hardware" });
    let outputFrame = 0;
    for await (const sample of sink.samplesAtTimestamps(sampleTimestamps(firstTimestamp, endTimestamp))) {
      if (!sample) continue;
      try {
        sample.setTimestamp(outputFrame / TIMELAPSE_FPS);
        sample.setDuration(1 / TIMELAPSE_FPS);
        await source.add(sample, { keyFrame: outputFrame % (TIMELAPSE_FPS * 2) === 0 });
        outputFrame += 1;
      } finally {
        sample.close();
      }
    }
    if (outputFrame === 0) throw new Error(`${file.name}: 영상 프레임을 찾지 못했습니다.`);
    source.close();
    await output.finalize();
    if (!target.buffer?.byteLength) throw new Error(`${file.name}: WebCodecs 출력이 비어 있습니다.`);
    return {
      blob: new Blob([target.buffer], { type: "video/webm" }),
      backend: "webcodecs",
    };
  } catch (cause) {
    if (!["canceled", "finalized"].includes(output.state)) await output.cancel();
    throw cause;
  } finally {
    source?.close();
    input.dispose();
  }
}

export const browserTimelapseTranscoder: TimelapseTranscoder = {
  async transcode(file) {
    if (file.size > MAX_VIDEO_SOURCE_BYTES) {
      throw new RangeError(`${file.name}: 원본 영상은 200 MiB 이하여야 합니다.`);
    }
    return transcodeWithFallback(file, {
      webCodecsSupported: webCodecsRuntimeAvailable(),
      transcodeWithWebCodecs,
      transcodeWithFfmpeg: (source) => ffmpegTimelapseTranscoder.transcode(source),
    });
  },
};
