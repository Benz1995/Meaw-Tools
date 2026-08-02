export const TEXT_LIMIT_BYTES = 2 * 1024 * 1024;
export const DIFF_SIDE_LIMIT_BYTES = 1024 * 1024;
export const FILE_LIMIT_BYTES = 5 * 1024 * 1024;
export const IMAGE_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const IMAGE_TOTAL_LIMIT_BYTES = 50 * 1024 * 1024;
export const IMAGE_FILE_COUNT_LIMIT = 20;
export const REGEX_TEXT_LIMIT = 100_000;

export function byteSize(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function assertWithinLimit(value: string, limit = TEXT_LIMIT_BYTES): void {
  if (byteSize(value) > limit) {
    throw new Error(`ข้อความมีขนาดใหญ่เกินไป (สูงสุด ${Math.round(limit / 1024 / 1024)} MB)`);
  }
}
