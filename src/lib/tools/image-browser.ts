export type BrowserImageMime = "image/jpeg" | "image/png" | "image/webp";

export type BrowserDecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export async function decodeBrowserImage(file: File): Promise<BrowserDecodedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Browser ไม่สามารถอ่านไฟล์รูปนี้ได้"));
    });
  } catch (caught) {
    URL.revokeObjectURL(objectUrl);
    throw caught;
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

export function canvasToImageBlob(canvas: HTMLCanvasElement, mime: BrowserImageMime, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Browser ไม่สามารถสร้างไฟล์ผลลัพธ์ได้"));
          return;
        }
        if (blob.type !== mime) {
          reject(new Error(`Browser นี้ไม่รองรับการสร้างไฟล์ ${mime.replace("image/", "").toUpperCase()}`));
          return;
        }
        resolve(blob);
      },
      mime,
      mime === "image/png" ? undefined : quality,
    );
  });
}
