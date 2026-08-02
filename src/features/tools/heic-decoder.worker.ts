import { decode } from "@discourse/heic";

type DecodeRequest = { id: string; buffer: ArrayBuffer };
type DecodeSuccess = { id: string; ok: true; width: number; height: number; pixels: ArrayBuffer };
type DecodeFailure = { id: string; ok: false; error: string };

self.addEventListener("message", async (event: MessageEvent<DecodeRequest>) => {
  const { id, buffer } = event.data;
  try {
    const image = await decode(buffer);
    const pixels = image.data.buffer as ArrayBuffer;
    const response: DecodeSuccess = { id, ok: true, width: image.width, height: image.height, pixels };
    self.postMessage(response, { transfer: [pixels] });
  } catch (caught) {
    const response: DecodeFailure = {
      id,
      ok: false,
      error: caught instanceof Error ? caught.message : "ถอดรหัส HEIC ไม่สำเร็จ",
    };
    self.postMessage(response);
  }
});

export {};
