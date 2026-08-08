import { describe, expect, it } from "vitest";
import { analyzeKeywordCoverage, buildResumePlainText, formatResumeDateRange, resumeFilename, validateResume, type ResumeDocument } from "@/lib/tools/resume";

const resume: ResumeDocument = {
  locale: "th",
  style: "classic",
  contact: { fullName: "กานต์ แมวดี", headline: "Frontend Developer", email: "kant@example.com", phone: "081-234-5678", location: "กรุงเทพฯ", website: "https://example.com" },
  summary: "นักพัฒนาเว็บที่เน้นประสบการณ์ผู้ใช้และการเข้าถึง",
  experiences: [{ id: "exp-1", role: "Frontend Developer", employer: "Meaw Studio", location: "กรุงเทพฯ", startDate: "2023", endDate: "", current: true, highlights: "พัฒนา React dashboard\nลดเวลาโหลดหน้า 35%" }],
  education: [{ id: "edu-1", degree: "วท.บ. วิทยาการคอมพิวเตอร์", institution: "มหาวิทยาลัยตัวอย่าง", location: "กรุงเทพฯ", startDate: "2019", endDate: "2023", details: "เกียรตินิยมอันดับ 2" }],
  skills: "React, TypeScript, Accessibility",
  languages: "ไทย — เจ้าของภาษา\nอังกฤษ — ทำงานได้",
  certifications: "Google UX Design Certificate",
};

describe("resume content", () => {
  it("builds ordered Thai plain text without empty sections", () => {
    const text = buildResumePlainText(resume);
    expect(text).toContain("กานต์ แมวดี\nFrontend Developer");
    expect(text).toContain("ประสบการณ์ทำงาน");
    expect(text).toContain("• ลดเวลาโหลดหน้า 35%");
    expect(text.indexOf("ประสบการณ์ทำงาน")).toBeLessThan(text.indexOf("การศึกษา"));
    expect(formatResumeDateRange("2023", "", true, "th")).toBe("2023 – ปัจจุบัน");
  });

  it("validates required fields, email, and item completeness", () => {
    const invalid: ResumeDocument = {
      ...resume,
      contact: { ...resume.contact, fullName: "", email: "bad-email", website: "javascript:alert(1)" },
      experiences: [{ ...resume.experiences[0]!, role: "" }],
    };
    expect(validateResume(invalid)).toEqual(expect.arrayContaining([
      "กรุณากรอกชื่อ–นามสกุล",
      "รูปแบบอีเมลไม่ถูกต้อง",
      "LinkedIn / Portfolio URL ต้องขึ้นต้นด้วย http:// หรือ https://",
      "ประสบการณ์รายการที่ 1 ต้องมีตำแหน่งและองค์กร",
    ]));
  });
});

describe("resume keyword coverage", () => {
  it("compares explainable Thai-English keywords without claiming an ATS score", () => {
    const result = analyzeKeywordCoverage(
      buildResumePlainText(resume),
      "ต้องการ Frontend Developer ที่ใช้ React TypeScript accessibility และ Next.js ทำ dashboard",
      "th",
    );
    expect(result.matched).toEqual(expect.arrayContaining(["frontend", "developer", "react", "typescript", "accessibility", "dashboard"]));
    expect(result.missing).toContain("next.js");
    expect(result.percent).toBeGreaterThan(50);
    expect(result.total).toBe(result.matched.length + result.missing.length);
  });

  it("returns an empty analysis for an empty job description", () => {
    expect(analyzeKeywordCoverage("React", "", "en")).toEqual({ percent: 0, matched: [], missing: [], total: 0 });
  });
});

describe("resume filename", () => {
  it("creates a safe localized filename", () => {
    expect(resumeFilename(" กานต์ / แมวดี ", "pdf")).toBe("กานต์-แมวดี-resume.pdf");
    expect(resumeFilename("", "txt")).toBe("resume.txt");
  });
});
