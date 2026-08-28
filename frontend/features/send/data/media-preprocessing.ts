import {
  MAX_ARCHIVE_BYTES,
  MEDIA_CODEC,
  MEDIA_TYPE,
  type MediaInput,
} from "@gibyeol/protocol";

export const MAX_IMAGE_EDGE = 2_048;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const WEBP_QUALITY = 0.82;
export const JPEG_QUALITY = 0.86;

const GBYL_HEADER_BYTES = 8;
const GBYL_ITEM_OVERHEAD_BYTES = 20 + 16;
const SUPPORTED_VIDEO_TYPES = new Set(["video/webm", "video/mp4"]);
const SUPPORTED_SOURCE_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close(): void;
}

export interface MediaPreprocessorRuntime {
  decodeImage(file: File): Promise<DecodedImage>;
  encodeImage(
    image: DecodedImage,
    width: number,
    height: number,
    mimeType: "image/webp" | "image/jpeg",
    quality: number,
  ): Promise<Blob | null>;
  canPlayVideo(mimeType: string): boolean;
}

export interface MediaPreprocessingSummary {
  originalBytes: number;
  processedBytes: number;
  estimatedArchiveBytes: number;
  convertedImages: number;
}

export interface PreprocessedMedia {
  items: MediaInput[];
  summary: MediaPreprocessingSummary;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

export const browserMediaRuntime: MediaPreprocessorRuntime = {
  async decodeImage(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  },
  async encodeImage(image, width, height, mimeType, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 변환을 위한 Canvas를 사용할 수 없습니다.");
    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image.source, 0, 0, width, height);
    return canvasToBlob(canvas, mimeType, quality);
  },
  canPlayVideo(mimeType) {
    if (typeof document === "undefined") return false;
    return document.createElement("video").canPlayType(mimeType) !== "";
  },
};

export function fitImageDimensions(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new RangeError("이미지 크기가 올바르지 않습니다.");
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    throw new RangeError("이미지 해상도가 4천만 픽셀을 초과합니다.");
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: scale < 1,
  };
}

export function estimateGbylBytes(items: readonly Pick<MediaInput, "bytes">[]) {
  return GBYL_HEADER_BYTES + items.reduce(
    (total, item) => total + GBYL_ITEM_OVERHEAD_BYTES + item.bytes.byteLength,
    0,
  );
}

export function assertArchiveSize(items: readonly Pick<MediaInput, "bytes">[]) {
  const estimated = estimateGbylBytes(items);
  if (estimated > MAX_ARCHIVE_BYTES) {
    throw new RangeError("사진·영상 소포가 암호화 후 10 MiB를 초과합니다.");
  }
  return estimated;
}

async function blobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function imageCodec(mimeType: string) {
  if (mimeType === "image/webp") return MEDIA_CODEC.WEBP;
  if (mimeType === "image/jpeg") return MEDIA_CODEC.JPEG;
  throw new TypeError("변환된 이미지 codec을 확인할 수 없습니다.");
}

async function preprocessImage(file: File, runtime: MediaPreprocessorRuntime) {
  if (!SUPPORTED_SOURCE_IMAGE_TYPES.has(file.type)) {
    throw new TypeError(`${file.name}: WebP, JPEG 또는 PNG 사진만 지원합니다.`);
  }
  const decoded = await runtime.decodeImage(file);
  try {
    const dimensions = fitImageDimensions(decoded.width, decoded.height);
    const webp = await runtime.encodeImage(
      decoded,
      dimensions.width,
      dimensions.height,
      "image/webp",
      WEBP_QUALITY,
    );
    const webpSupported = webp?.type === "image/webp";
    const converted = webpSupported
      ? webp
      : await runtime.encodeImage(
        decoded,
        dimensions.width,
        dimensions.height,
        "image/jpeg",
        JPEG_QUALITY,
      );
    if (!converted || !["image/webp", "image/jpeg"].includes(converted.type)) {
      throw new Error(`${file.name}: 브라우저에서 사진을 WebP/JPEG로 변환하지 못했습니다.`);
    }

    const canKeepOriginal = !dimensions.resized && ["image/webp", "image/jpeg"].includes(file.type);
    const selected = canKeepOriginal && file.size <= converted.size ? file : converted;
    return {
      item: {
        type: MEDIA_TYPE.IMAGE,
        codec: imageCodec(selected.type),
        bytes: await blobBytes(selected),
      } satisfies MediaInput,
      converted: selected !== file,
    };
  } finally {
    decoded.close();
  }
}

async function preprocessVideo(file: File, runtime: MediaPreprocessorRuntime) {
  if (!SUPPORTED_VIDEO_TYPES.has(file.type)) {
    throw new TypeError(`${file.name}: WebM 또는 MP4 영상만 지원합니다.`);
  }
  if (!runtime.canPlayVideo(file.type)) {
    throw new TypeError(`${file.name}: 이 브라우저에서 재생할 수 없는 영상 형식입니다.`);
  }
  return {
    type: MEDIA_TYPE.TIMELAPSE,
    codec: file.type === "video/webm" ? MEDIA_CODEC.WEBM : MEDIA_CODEC.MP4,
    bytes: await blobBytes(file),
  } satisfies MediaInput;
}

export async function preprocessMediaFiles(
  files: readonly File[],
  runtime: MediaPreprocessorRuntime = browserMediaRuntime,
): Promise<PreprocessedMedia> {
  const items: MediaInput[] = [];
  let convertedImages = 0;
  for (const file of files) {
    if (file.size === 0) throw new RangeError(`${file.name}: 빈 파일은 첨부할 수 없습니다.`);
    if (file.type.startsWith("image/")) {
      const processed = await preprocessImage(file, runtime);
      items.push(processed.item);
      if (processed.converted) convertedImages += 1;
    } else {
      items.push(await preprocessVideo(file, runtime));
    }
  }

  return {
    items,
    summary: {
      originalBytes: files.reduce((total, file) => total + file.size, 0),
      processedBytes: items.reduce((total, item) => total + item.bytes.byteLength, 0),
      estimatedArchiveBytes: assertArchiveSize(items),
      convertedImages,
    },
  };
}

export function formatMediaBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KiB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(2)} MiB`;
}
