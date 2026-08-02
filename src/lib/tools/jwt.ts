import { decodeJwt, decodeProtectedHeader, errors } from "jose";

export type JwtResult = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  issuedAt?: Date;
  expiresAt?: Date;
  expired?: boolean;
};

export function decodeJwtLocally(token: string, now = new Date()): JwtResult {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("ไม่สามารถ Decode JWT ได้ Token ต้องมี 3 ส่วน");
  }
  try {
    const header = decodeProtectedHeader(token);
    const payload = decodeJwt(token);
    const issuedAt = typeof payload.iat === "number" ? new Date(payload.iat * 1000) : undefined;
    const expiresAt = typeof payload.exp === "number" ? new Date(payload.exp * 1000) : undefined;
    return {
      header,
      payload,
      signature: parts[2] ?? "",
      issuedAt,
      expiresAt,
      expired: expiresAt ? expiresAt.getTime() <= now.getTime() : undefined,
    };
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof TypeError) {
      throw new Error("ไม่สามารถ Decode JWT ได้ Token อาจมี Base64URL หรือ JSON ไม่ถูกต้อง");
    }
    throw error;
  }
}
