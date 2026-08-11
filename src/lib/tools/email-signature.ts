export type EmailSignatureTemplate = "modern" | "classic" | "compact";

export type EmailSignatureDocument = {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  lineId: string;
  linkedin: string;
  facebook: string;
  instagram: string;
  photoUrl: string;
  accentColor: string;
  template: EmailSignatureTemplate;
  disclaimer: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const UNSAFE_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanText(value: string): string {
  return value.trim().replace(UNSAFE_CONTROL_PATTERN, "");
}

function normalizeWebUrl(value: string, label: string): string {
  const trimmed = cleanText(value);
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${label}ไม่ใช่ URL ที่ถูกต้อง`);
  }
  if (!(["http:", "https:"] as const).includes(parsed.protocol as "http:" | "https:")) {
    throw new Error(`${label}ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น`);
  }
  if (parsed.username || parsed.password) throw new Error(`${label}ต้องไม่มีชื่อผู้ใช้หรือรหัสผ่านใน URL`);
  return parsed.toString();
}

function displayUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.host}${path}`;
  } catch {
    return value;
  }
}

function safeFilenamePart(value: string): string {
  return cleanText(value).replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function initials(value: string): string {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return "ME";
  return words.slice(0, 2).map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase("th-TH");
}

type NormalizedSignature = EmailSignatureDocument & {
  normalizedWebsite: string;
  normalizedLinkedin: string;
  normalizedFacebook: string;
  normalizedInstagram: string;
  normalizedPhotoUrl: string;
};

export function validateEmailSignature(document: EmailSignatureDocument): NormalizedSignature {
  const fullName = cleanText(document.fullName);
  if (!fullName) throw new Error("กรุณากรอกชื่อและนามสกุล");
  const email = cleanText(document.email);
  if (email && (!EMAIL_PATTERN.test(email) || email.length > 254)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  if (!HEX_COLOR_PATTERN.test(document.accentColor)) throw new Error("สีหลักต้องเป็นรหัสสี Hex 6 หลัก");
  return {
    ...document,
    fullName,
    jobTitle: cleanText(document.jobTitle),
    company: cleanText(document.company),
    email,
    phone: cleanText(document.phone),
    website: cleanText(document.website),
    address: cleanText(document.address),
    lineId: cleanText(document.lineId).replace(/^@/, ""),
    linkedin: cleanText(document.linkedin),
    facebook: cleanText(document.facebook),
    instagram: cleanText(document.instagram),
    photoUrl: cleanText(document.photoUrl),
    disclaimer: cleanText(document.disclaimer),
    accentColor: document.accentColor.toLowerCase(),
    normalizedWebsite: normalizeWebUrl(document.website, "เว็บไซต์"),
    normalizedLinkedin: normalizeWebUrl(document.linkedin, "LinkedIn"),
    normalizedFacebook: normalizeWebUrl(document.facebook, "Facebook"),
    normalizedInstagram: normalizeWebUrl(document.instagram, "Instagram"),
    normalizedPhotoUrl: normalizeWebUrl(document.photoUrl, "URL รูปภาพ"),
  };
}

function link(value: string, href: string, color: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:none;">${escapeHtml(value)}</a>`;
}

function avatarHtml(document: NormalizedSignature, size: number): string {
  if (document.normalizedPhotoUrl) {
    return `<img src="${escapeHtml(document.normalizedPhotoUrl)}" width="${size}" height="${size}" alt="${escapeHtml(document.fullName)}" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:999px;object-fit:cover;" />`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;border-radius:999px;background-color:${document.accentColor};color:#ffffff;font-family:Arial,'Helvetica Neue',sans-serif;font-size:${Math.round(size * 0.3)}px;font-weight:700;line-height:${size}px;text-align:center;">${escapeHtml(initials(document.fullName))}</td></tr></table>`;
}

function identityHtml(document: NormalizedSignature, compact = false): string {
  const title = [document.jobTitle, document.company].filter(Boolean).map(escapeHtml).join(" &middot; ");
  return `<div style="font-family:Arial,'Helvetica Neue',sans-serif;font-size:${compact ? 16 : 18}px;font-weight:700;line-height:1.35;color:#1f2937;">${escapeHtml(document.fullName)}</div>${title ? `<div style="margin-top:2px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:12px;font-weight:600;line-height:1.45;color:${document.accentColor};">${title}</div>` : ""}`;
}

function contactHtml(document: NormalizedSignature): string {
  const contacts: string[] = [];
  if (document.email) contacts.push(link(document.email, `mailto:${document.email}`, document.accentColor));
  if (document.phone) {
    const phoneHref = document.phone.replace(/[^\d+]/g, "");
    contacts.push(link(document.phone, `tel:${phoneHref}`, document.accentColor));
  }
  if (document.normalizedWebsite) contacts.push(link(displayUrl(document.normalizedWebsite), document.normalizedWebsite, document.accentColor));
  if (document.lineId) contacts.push(link(`LINE: ${document.lineId}`, `https://line.me/ti/p/~${encodeURIComponent(document.lineId)}`, document.accentColor));
  const rows = contacts.map((item) => `<div style="margin-top:3px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:11px;line-height:1.45;color:#4b5563;">${item}</div>`).join("");
  const address = document.address ? `<div style="margin-top:3px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:11px;line-height:1.45;color:#6b7280;">${escapeHtml(document.address)}</div>` : "";
  return rows + address;
}

function socialHtml(document: NormalizedSignature): string {
  const socials: string[] = [];
  if (document.normalizedLinkedin) socials.push(link("LinkedIn", document.normalizedLinkedin, document.accentColor));
  if (document.normalizedFacebook) socials.push(link("Facebook", document.normalizedFacebook, document.accentColor));
  if (document.normalizedInstagram) socials.push(link("Instagram", document.normalizedInstagram, document.accentColor));
  return socials.length ? `<div style="margin-top:7px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:10px;line-height:1.4;color:#6b7280;">${socials.join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;")}</div>` : "";
}

function disclaimerHtml(document: NormalizedSignature): string {
  return document.disclaimer ? `<tr><td colspan="3" style="padding-top:10px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:9px;line-height:1.45;color:#9ca3af;">${escapeHtml(document.disclaimer)}</td></tr>` : "";
}

function modernTemplate(document: NormalizedSignature): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;"><tr><td width="92" valign="top" style="width:92px;padding:0 16px 0 0;">${avatarHtml(document, 76)}</td><td width="3" style="width:3px;background-color:${document.accentColor};font-size:0;line-height:0;">&nbsp;</td><td valign="top" style="padding:0 0 0 16px;">${identityHtml(document)}${contactHtml(document)}${socialHtml(document)}</td></tr>${disclaimerHtml(document)}</table>`;
}

function classicTemplate(document: NormalizedSignature): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Georgia,'Times New Roman',serif;color:#1f2937;"><tr><td style="padding:0 0 8px 0;border-bottom:2px solid ${document.accentColor};">${identityHtml(document)}</td></tr><tr><td style="padding-top:8px;">${contactHtml(document)}${socialHtml(document)}</td></tr>${document.disclaimer ? `<tr><td style="padding-top:10px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:9px;line-height:1.45;color:#9ca3af;">${escapeHtml(document.disclaimer)}</td></tr>` : ""}</table>`;
}

function compactTemplate(document: NormalizedSignature): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;"><tr><td width="54" valign="top" style="width:54px;padding-right:12px;">${avatarHtml(document, 46)}</td><td valign="top">${identityHtml(document, true)}${contactHtml(document)}${socialHtml(document)}</td></tr>${document.disclaimer ? `<tr><td colspan="2" style="padding-top:8px;font-family:Arial,'Helvetica Neue',sans-serif;font-size:9px;line-height:1.45;color:#9ca3af;">${escapeHtml(document.disclaimer)}</td></tr>` : ""}</table>`;
}

export function buildEmailSignatureHtml(document: EmailSignatureDocument): string {
  const normalized = validateEmailSignature(document);
  if (normalized.template === "classic") return classicTemplate(normalized);
  if (normalized.template === "compact") return compactTemplate(normalized);
  return modernTemplate(normalized);
}

export function buildEmailSignaturePlainText(document: EmailSignatureDocument): string {
  const normalized = validateEmailSignature(document);
  const lines = [
    normalized.fullName,
    [normalized.jobTitle, normalized.company].filter(Boolean).join(" · "),
    normalized.email,
    normalized.phone,
    normalized.normalizedWebsite,
    normalized.address,
    normalized.lineId ? `LINE: ${normalized.lineId}` : "",
    normalized.normalizedLinkedin,
    normalized.normalizedFacebook,
    normalized.normalizedInstagram,
    normalized.disclaimer ? `\n${normalized.disclaimer}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildEmailSignatureDocument(document: EmailSignatureDocument): string {
  const signature = buildEmailSignatureHtml(document);
  return `<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>Email signature - ${escapeHtml(cleanText(document.fullName))}</title>\n</head>\n<body style="margin:0;padding:24px;background:#ffffff;">\n${signature}\n</body>\n</html>`;
}

export function emailSignatureFilename(fullName: string): string {
  return `email-signature-${safeFilenamePart(fullName) || "draft"}.html`;
}
