export const UTM_FIELD_LIMIT = 200;
export const UTM_URL_LIMIT = 8_192;

export const managedUtmKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_source_platform",
  "utm_term",
  "utm_content",
] as const;

export type ManagedUtmKey = (typeof managedUtmKeys)[number];

export type UtmFields = {
  source: string;
  medium: string;
  campaign: string;
  id: string;
  sourcePlatform: string;
  term: string;
  content: string;
};

export type UtmBuildOptions = {
  lowercase: boolean;
  spacesToUnderscores: boolean;
};

export type UtmBuildResult = {
  url: string;
  parameters: Array<{ key: ManagedUtmKey; value: string }>;
  replacedParameterCount: number;
};

export type ParsedUtmUrl = {
  baseUrl: string;
  fields: UtmFields;
  importedParameterCount: number;
};

export const emptyUtmFields: UtmFields = {
  source: "",
  medium: "",
  campaign: "",
  id: "",
  sourcePlatform: "",
  term: "",
  content: "",
};

const fieldToParameter: Record<keyof UtmFields, ManagedUtmKey> = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  id: "utm_id",
  sourcePlatform: "utm_source_platform",
  term: "utm_term",
  content: "utm_content",
};

const parameterToField = Object.fromEntries(
  Object.entries(fieldToParameter).map(([field, parameter]) => [parameter, field]),
) as Record<ManagedUtmKey, keyof UtmFields>;

function parseWebUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("กรุณากรอก URL ปลายทาง");
  if (trimmed.length > UTM_URL_LIMIT) throw new Error(`URL ยาวเกิน ${UTM_URL_LIMIT.toLocaleString("en-US")} ตัวอักษร`);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("URL ไม่ถูกต้อง กรุณาใส่ https:// หรือ http:// พร้อมชื่อโดเมน");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("รองรับเฉพาะ URL แบบ https:// หรือ http://");
  if (!url.hostname || (!url.hostname.includes(".") && url.hostname !== "localhost")) throw new Error("URL ต้องมีชื่อโดเมนที่ถูกต้อง");
  if (url.username || url.password) throw new Error("ไม่รองรับ URL ที่มีชื่อผู้ใช้หรือรหัสผ่านฝังอยู่");
  return url;
}

function normalizeValue(value: string, options: UtmBuildOptions): string {
  let normalized = value.trim();
  if (normalized.length > UTM_FIELD_LIMIT) throw new Error(`ค่า UTM แต่ละช่องต้องไม่เกิน ${UTM_FIELD_LIMIT} ตัวอักษร`);
  if (/[\u0000-\u001F\u007F]/.test(normalized)) throw new Error("ค่า UTM ต้องไม่มีอักขระควบคุมหรือขึ้นบรรทัดใหม่");
  if (options.spacesToUnderscores) normalized = normalized.replace(/\s+/g, "_");
  if (options.lowercase) normalized = normalized.toLocaleLowerCase("en-US");
  return normalized;
}

export function buildUtmUrl(baseUrl: string, fields: UtmFields, options: UtmBuildOptions): UtmBuildResult {
  const url = parseWebUrl(baseUrl);
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeValue(value, options)]),
  ) as UtmFields;

  if (!normalizedFields.source) throw new Error("กรุณากรอก Campaign Source เช่น google, newsletter หรือ facebook");
  if (!normalizedFields.medium) throw new Error("กรุณากรอก Campaign Medium เช่น cpc, email หรือ paid_social");
  if (!normalizedFields.campaign) throw new Error("กรุณากรอก Campaign Name เพื่อแยกแคมเปญในรายงาน");

  let replacedParameterCount = 0;
  for (const key of managedUtmKeys) {
    replacedParameterCount += url.searchParams.getAll(key).length;
    url.searchParams.delete(key);
  }

  const parameters: UtmBuildResult["parameters"] = [];
  for (const [field, key] of Object.entries(fieldToParameter) as Array<[keyof UtmFields, ManagedUtmKey]>) {
    const value = normalizedFields[field];
    if (!value) continue;
    url.searchParams.append(key, value);
    parameters.push({ key, value });
  }

  const output = url.toString();
  if (output.length > UTM_URL_LIMIT) throw new Error(`ลิงก์ที่สร้างยาวเกิน ${UTM_URL_LIMIT.toLocaleString("en-US")} ตัวอักษร กรุณาลดความยาวค่า UTM`);
  return { url: output, parameters, replacedParameterCount };
}

export function parseUtmUrl(input: string): ParsedUtmUrl {
  const url = parseWebUrl(input);
  const fields = { ...emptyUtmFields };
  let importedParameterCount = 0;

  for (const key of managedUtmKeys) {
    const values = url.searchParams.getAll(key);
    if (values.length) {
      fields[parameterToField[key]] = values.at(-1) ?? "";
      importedParameterCount += values.length;
    }
    url.searchParams.delete(key);
  }

  if (!importedParameterCount) throw new Error("ไม่พบพารามิเตอร์ UTM ที่รองรับใน URL นี้");
  return { baseUrl: url.toString(), fields, importedParameterCount };
}
