import type { InferenceSession } from "onnxruntime-web";

export const BACKGROUND_REMOVAL_MODEL = "BritishWerewolf/U-2-Netp";
export const BACKGROUND_REMOVAL_MODEL_URL = `https://huggingface.co/${BACKGROUND_REMOVAL_MODEL}/resolve/main/onnx/model.onnx`;
export const BACKGROUND_REMOVAL_MAX_DIMENSION = 4_096;
export const BACKGROUND_REMOVAL_MAX_PIXELS = 16_000_000;

type ModelProgressEvent = {
  status?: string;
  progress?: number;
};

type ProgressListener = (event: unknown) => void;

let sessionPromise: Promise<InferenceSession> | null = null;
const progressListeners = new Set<ProgressListener>();

export function getModelDownloadPercent(event: unknown): number | null {
  if (!event || typeof event !== "object") return null;
  const { status, progress } = event as ModelProgressEvent;
  if (status !== "progress" || typeof progress !== "number" || !Number.isFinite(progress)) return null;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function createAlphaMaskPixels(values: ArrayLike<number>): Uint8ClampedArray {
  if (values.length === 0) throw new Error("Mask ไม่มีข้อมูล");
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const value = Number(values[index]);
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }

  const range = Math.max(maximum - minimum, Number.EPSILON);
  const pixels = new Uint8ClampedArray(values.length * 4);
  for (let index = 0; index < values.length; index += 1) {
    const alpha = Math.round(((Number(values[index]) - minimum) / range) * 255);
    const target = index * 4;
    pixels[target] = 255;
    pixels[target + 1] = 255;
    pixels[target + 2] = 255;
    pixels[target + 3] = alpha;
  }
  return pixels;
}

function notifyProgress(event: unknown) {
  for (const listener of progressListeners) listener(event);
}

async function downloadModel() {
  const response = await fetch(BACKGROUND_REMOVAL_MODEL_URL);
  if (!response.ok) throw new Error("ดาวน์โหลดโมเดล AI ไม่สำเร็จ");

  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    notifyProgress({ status: "progress", progress: total ? (received / total) * 100 : Math.min(90, received / 50_000) });
  }

  const model = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    model.set(chunk, offset);
    offset += chunk.length;
  }
  return model;
}

async function createSession() {
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {
    mjs: "/ai-runtime/v1.22.0/ort-wasm-simd-threaded.mjs",
    wasm: "/ai-runtime/v1.22.0/ort-wasm-simd-threaded.wasm",
  };
  const model = await downloadModel();
  return ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
}

export async function loadBackgroundRemovalSession(onProgress?: ProgressListener) {
  if (onProgress) progressListeners.add(onProgress);
  sessionPromise ??= createSession().catch((error) => {
    sessionPromise = null;
    throw error;
  });

  try {
    return await sessionPromise;
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("สร้าง PNG โปร่งใสไม่สำเร็จ")), "image/png");
  });
}

export async function removeImageBackground(
  file: File,
  onProgress?: ProgressListener,
  onModelReady?: () => void,
): Promise<Blob> {
  const [ort, session] = await Promise.all([
    import("onnxruntime-web/wasm"),
    loadBackgroundRemovalSession(onProgress),
  ]);
  onModelReady?.();
  const source = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    if (source.width > BACKGROUND_REMOVAL_MAX_DIMENSION || source.height > BACKGROUND_REMOVAL_MAX_DIMENSION || source.width * source.height > BACKGROUND_REMOVAL_MAX_PIXELS) {
      throw new Error("รูปสำหรับลบพื้นหลังต้องมีด้านยาวไม่เกิน 4,096 px และรวมไม่เกิน 16 ล้านพิกเซล");
    }

    const modelSize = 320;
    const inputCanvas = document.createElement("canvas");
    inputCanvas.width = modelSize;
    inputCanvas.height = modelSize;
    const inputContext = inputCanvas.getContext("2d", { willReadFrequently: true });
    if (!inputContext) throw new Error("Browser ไม่รองรับ Canvas");
    inputContext.drawImage(source, 0, 0, modelSize, modelSize);
    const pixels = inputContext.getImageData(0, 0, modelSize, modelSize).data;
    const input = new Float32Array(3 * modelSize * modelSize);
    const area = modelSize * modelSize;
    const means = [0.485, 0.456, 0.406];
    const standardDeviations = [0.229, 0.224, 0.225];

    for (let index = 0; index < area; index += 1) {
      const sourceIndex = index * 4;
      input[index] = (pixels[sourceIndex]! / 255 - means[0]!) / standardDeviations[0]!;
      input[area + index] = (pixels[sourceIndex + 1]! / 255 - means[1]!) / standardDeviations[1]!;
      input[area * 2 + index] = (pixels[sourceIndex + 2]! / 255 - means[2]!) / standardDeviations[2]!;
    }

    const tensor = new ort.Tensor("float32", input, [1, 3, modelSize, modelSize]);
    const result = await session.run({ [session.inputNames[0]!]: tensor });
    const output = result[session.outputNames[0]!];
    if (!output) throw new Error("โมเดลไม่สามารถสร้าง Mask ได้");
    const maskValues = output.data as Float32Array;
    if (maskValues.length !== area) throw new Error("ขนาด Mask จากโมเดลไม่ถูกต้อง");
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = modelSize;
    maskCanvas.height = modelSize;
    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) throw new Error("Browser ไม่สามารถสร้าง Mask ได้");
    const maskImage = maskContext.createImageData(modelSize, modelSize);
    maskImage.data.set(createAlphaMaskPixels(maskValues));
    maskContext.putImageData(maskImage, 0, 0);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = source.width;
    outputCanvas.height = source.height;
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) throw new Error("Browser ไม่สามารถสร้าง PNG ได้");
    outputContext.drawImage(source, 0, 0);
    outputContext.globalCompositeOperation = "destination-in";
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(maskCanvas, 0, 0, source.width, source.height);
    return canvasToBlob(outputCanvas);
  } finally {
    source.close();
  }
}
