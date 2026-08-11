import { describe, expect, it } from "vitest";
import {
  buildEmailSignatureDocument,
  buildEmailSignatureHtml,
  buildEmailSignaturePlainText,
  emailSignatureFilename,
  validateEmailSignature,
  type EmailSignatureDocument,
} from "@/lib/tools/email-signature";

const sample: EmailSignatureDocument = {
  fullName: "กานต์ แมวดี",
  jobTitle: "Product Designer",
  company: "Meaw Studio",
  email: "kant@example.com",
  phone: "081-234-5678",
  website: "meaw.example",
  address: "กรุงเทพฯ ประเทศไทย",
  lineId: "@kantmeaw",
  linkedin: "linkedin.com/in/kant-meaw",
  facebook: "",
  instagram: "instagram.com/kantmeaw",
  photoUrl: "",
  accentColor: "#13795b",
  template: "modern",
  disclaimer: "ข้อความนี้อาจมีข้อมูลที่เป็นความลับ",
};

describe("email signature validation", () => {
  it("normalizes safe web URLs and LINE IDs", () => {
    expect(validateEmailSignature(sample)).toMatchObject({
      normalizedWebsite: "https://meaw.example/",
      normalizedLinkedin: "https://linkedin.com/in/kant-meaw",
      normalizedInstagram: "https://instagram.com/kantmeaw",
      lineId: "kantmeaw",
    });
  });

  it("rejects unsafe protocols, credentials, invalid email, and CSS colors", () => {
    expect(() => validateEmailSignature({ ...sample, website: "javascript:alert(1)" })).toThrow("http:// หรือ https://");
    expect(() => validateEmailSignature({ ...sample, linkedin: "https://user:secret@example.com" })).toThrow("รหัสผ่าน");
    expect(() => validateEmailSignature({ ...sample, email: "not-an-email" })).toThrow("อีเมล");
    expect(() => validateEmailSignature({ ...sample, accentColor: "red;position:fixed" })).toThrow("Hex");
  });
});

describe("email signature exports", () => {
  it.each(["modern", "classic", "compact"] as const)("builds escaped, table-based %s HTML", (template) => {
    const html = buildEmailSignatureHtml({ ...sample, template, fullName: '<script>alert("x")</script>' });
    expect(html).toContain('role="presentation"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="mailto:kant@example.com"');
  });

  it("creates plain text and a standalone HTML document", () => {
    expect(buildEmailSignaturePlainText(sample)).toContain("Product Designer · Meaw Studio");
    const output = buildEmailSignatureDocument(sample);
    expect(output).toContain("<!doctype html>");
    expect(output).toContain('<meta charset="utf-8"');
    expect(output).not.toContain("<style");
    expect(output).not.toContain("<script");
  });

  it("creates a safe filename", () => {
    expect(emailSignatureFilename("กานต์ / Meaw: Studio")).toBe("email-signature-กานต์-Meaw-Studio.html");
  });
});
