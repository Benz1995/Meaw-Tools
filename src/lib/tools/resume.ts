export type ResumeLocale = "th" | "en";
export type ResumeStyle = "classic" | "modern";

export type ResumeContact = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
};

export type ResumeExperience = {
  id: string;
  role: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string;
};

export type ResumeEducation = {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  details: string;
};

export type ResumeDocument = {
  locale: ResumeLocale;
  style: ResumeStyle;
  contact: ResumeContact;
  summary: string;
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  skills: string;
  languages: string;
  certifications: string;
};

export type KeywordCoverage = {
  percent: number;
  matched: string[];
  missing: string[];
  total: number;
};

export const RESUME_EXPERIENCE_LIMIT = 8;
export const RESUME_EDUCATION_LIMIT = 6;
export const RESUME_TEXT_LIMIT = 20_000;
export const RESUME_JOB_DESCRIPTION_LIMIT = 12_000;

const labels = {
  th: {
    summary: "สรุปโปรไฟล์",
    experience: "ประสบการณ์ทำงาน",
    education: "การศึกษา",
    skills: "ทักษะ",
    languages: "ภาษา",
    certifications: "ใบรับรองและผลงาน",
    present: "ปัจจุบัน",
  },
  en: {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    certifications: "Certifications & Achievements",
    present: "Present",
  },
} as const;

const englishStopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "of", "on", "or", "our", "that", "the", "their", "this", "to", "we", "will", "with", "you", "your",
]);

const thaiStopWords = new Set([
  "การ", "กับ", "ก็", "ของ", "ขึ้น", "คือ", "จะ", "จาก", "ซึ่ง", "ด้าน", "ด้วย", "ต้อง", "ที่", "ทำ", "ทั้ง", "ทาง", "นี้", "ใน", "เป็น", "เพื่อ", "และ", "หรือ", "อยู่", "ให้", "ได้", "มี", "ไม่",
]);

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SAFE_FILENAME = /[^\p{L}\p{M}\p{N}._-]+/gu;

function clean(value: string): string {
  return value.replace(CONTROL_CHARACTERS, " ").trim();
}

function cleanLines(value: string, limit = 8): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => clean(line).replace(/^[•\-*]\s*/, ""))
    .filter(Boolean)
    .slice(0, limit);
}

function splitList(value: string, limit = 30): string[] {
  return value
    .split(/[,;\n]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, limit);
}

export function formatResumeDateRange(startDate: string, endDate: string, current: boolean, locale: ResumeLocale): string {
  const start = clean(startDate);
  const end = current ? labels[locale].present : clean(endDate);
  return [start, end].filter(Boolean).join(" – ");
}

export function validateResume(documentData: ResumeDocument): string[] {
  const issues: string[] = [];
  const contact = documentData.contact;
  if (!clean(contact.fullName)) issues.push("กรุณากรอกชื่อ–นามสกุล");
  if (contact.fullName.length > 100) issues.push("ชื่อ–นามสกุลต้องไม่เกิน 100 ตัวอักษร");
  if (contact.headline.length > 120) issues.push("ตำแหน่งเป้าหมายต้องไม่เกิน 120 ตัวอักษร");
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) issues.push("รูปแบบอีเมลไม่ถูกต้อง");
  if (contact.website) {
    try {
      const website = new URL(contact.website.trim());
      if (!['http:', 'https:'].includes(website.protocol)) issues.push("LinkedIn / Portfolio URL ต้องขึ้นต้นด้วย http:// หรือ https://");
    } catch {
      issues.push("LinkedIn / Portfolio URL ไม่ถูกต้อง");
    }
  }
  if (documentData.summary.length > 1_200) issues.push("สรุปโปรไฟล์ต้องไม่เกิน 1,200 ตัวอักษร");
  if (documentData.experiences.length > RESUME_EXPERIENCE_LIMIT) issues.push(`เพิ่มประสบการณ์ได้ไม่เกิน ${RESUME_EXPERIENCE_LIMIT} รายการ`);
  if (documentData.education.length > RESUME_EDUCATION_LIMIT) issues.push(`เพิ่มการศึกษาได้ไม่เกิน ${RESUME_EDUCATION_LIMIT} รายการ`);

  documentData.experiences.forEach((item, index) => {
    if (!clean(item.role) || !clean(item.employer)) issues.push(`ประสบการณ์รายการที่ ${index + 1} ต้องมีตำแหน่งและองค์กร`);
    if (cleanLines(item.highlights, 9).length > 8) issues.push(`ประสบการณ์รายการที่ ${index + 1} ใส่ผลงานได้ไม่เกิน 8 บรรทัด`);
  });
  documentData.education.forEach((item, index) => {
    if (!clean(item.degree) || !clean(item.institution)) issues.push(`การศึกษารายการที่ ${index + 1} ต้องมีวุฒิและสถาบัน`);
  });

  const totalText = [
    ...Object.values(contact),
    documentData.summary,
    documentData.skills,
    documentData.languages,
    documentData.certifications,
    ...documentData.experiences.flatMap((item) => Object.values(item)),
    ...documentData.education.flatMap((item) => Object.values(item)),
  ].reduce((total, value) => total + String(value).length, 0);
  if (totalText > RESUME_TEXT_LIMIT) issues.push(`ข้อมูลเรซูเม่รวมต้องไม่เกิน ${RESUME_TEXT_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  return issues;
}

export function buildResumePlainText(documentData: ResumeDocument): string {
  const copy = labels[documentData.locale];
  const sections: string[] = [];
  const contactLine = [documentData.contact.email, documentData.contact.phone, documentData.contact.location, documentData.contact.website].map(clean).filter(Boolean).join(" | ");
  sections.push([clean(documentData.contact.fullName), clean(documentData.contact.headline), contactLine].filter(Boolean).join("\n"));

  if (clean(documentData.summary)) sections.push(`${copy.summary.toUpperCase()}\n${clean(documentData.summary)}`);
  if (documentData.experiences.length) {
    const experienceText = documentData.experiences.map((item) => {
      const heading = [clean(item.role), clean(item.employer)].filter(Boolean).join(" — ");
      const meta = [clean(item.location), formatResumeDateRange(item.startDate, item.endDate, item.current, documentData.locale)].filter(Boolean).join(" | ");
      const highlights = cleanLines(item.highlights).map((line) => `• ${line}`).join("\n");
      return [heading, meta, highlights].filter(Boolean).join("\n");
    }).join("\n\n");
    sections.push(`${copy.experience.toUpperCase()}\n${experienceText}`);
  }
  if (documentData.education.length) {
    const educationText = documentData.education.map((item) => {
      const heading = [clean(item.degree), clean(item.institution)].filter(Boolean).join(" — ");
      const meta = [clean(item.location), formatResumeDateRange(item.startDate, item.endDate, false, documentData.locale)].filter(Boolean).join(" | ");
      return [heading, meta, clean(item.details)].filter(Boolean).join("\n");
    }).join("\n\n");
    sections.push(`${copy.education.toUpperCase()}\n${educationText}`);
  }
  const skills = splitList(documentData.skills);
  if (skills.length) sections.push(`${copy.skills.toUpperCase()}\n${skills.join(" • ")}`);
  const languages = cleanLines(documentData.languages, 20);
  if (languages.length) sections.push(`${copy.languages.toUpperCase()}\n${languages.join("\n")}`);
  const certifications = cleanLines(documentData.certifications, 20);
  if (certifications.length) sections.push(`${copy.certifications.toUpperCase()}\n${certifications.join("\n")}`);
  return sections.filter(Boolean).join("\n\n").trim();
}

function tokenize(value: string, locale: ResumeLocale): string[] {
  const normalized = value.normalize("NFKC").toLocaleLowerCase(locale === "th" ? "th-TH" : "en-US");
  const segmenter = new Intl.Segmenter(locale === "th" ? "th" : "en", { granularity: "word" });
  return Array.from(segmenter.segment(normalized))
    .filter((part) => part.isWordLike)
    .map((part) => part.segment.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""))
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token) && !thaiStopWords.has(token) && !englishStopWords.has(token));
}

export function analyzeKeywordCoverage(resumeText: string, jobDescription: string, locale: ResumeLocale): KeywordCoverage {
  if (jobDescription.length > RESUME_JOB_DESCRIPTION_LIMIT) throw new Error(`รายละเอียดงานต้องไม่เกิน ${RESUME_JOB_DESCRIPTION_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  const resumeTokens = new Set(tokenize(resumeText, locale));
  const counts = new Map<string, { count: number; first: number }>();
  tokenize(jobDescription, locale).forEach((token, index) => {
    const current = counts.get(token);
    counts.set(token, { count: (current?.count ?? 0) + 1, first: current?.first ?? index });
  });
  const keywords = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([keyword]) => keyword);
  const matched = keywords.filter((keyword) => resumeTokens.has(keyword));
  const missing = keywords.filter((keyword) => !resumeTokens.has(keyword));
  return {
    percent: keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0,
    matched,
    missing,
    total: keywords.length,
  };
}

export function resumeFilename(fullName: string, extension: "pdf" | "txt"): string {
  const normalized = clean(fullName).normalize("NFKC").replace(SAFE_FILENAME, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${normalized ? `${normalized}-resume` : "resume"}.${extension}`;
}

export const resumeLabels = labels;
export const resumeListItems = splitList;
export const resumeHighlightLines = cleanLines;
