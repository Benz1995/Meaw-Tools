import { describe, expect, it } from "vitest";
import { buildFaviconHeadSnippet, buildWebManifest, calculateIconDrawPlan, createMultiSizeIco, validateManifestPath } from "@/lib/tools/favicon";

const pngBytes = (marker: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, marker]);

describe("favicon geometry", () => {
  it("contains a wide logo inside the requested padding", () => {
    expect(calculateIconDrawPlan(1_600, 800, 512, 10, "contain")).toEqual({
      sx: 0,
      sy: 0,
      sourceWidth: 1_600,
      sourceHeight: 800,
      dx: 51.19999999999999,
      dy: 153.6,
      width: 409.6,
      height: 204.8,
    });
  });

  it("center-crops a wide image in cover mode", () => {
    expect(calculateIconDrawPlan(1_600, 800, 512, 0, "cover")).toEqual({
      sx: 400,
      sy: 0,
      sourceWidth: 800,
      sourceHeight: 800,
      dx: 0,
      dy: 0,
      width: 512,
      height: 512,
    });
  });
});

describe("multi-size ICO", () => {
  it("writes a valid little-endian ICO directory with embedded PNG layers", () => {
    const ico = createMultiSizeIco([
      { size: 16, bytes: pngBytes(16) },
      { size: 32, bytes: pngBytes(32) },
      { size: 48, bytes: pngBytes(48) },
    ]);
    const view = new DataView(ico.buffer);
    expect([...ico.slice(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    expect(view.getUint32(6 + 12, true)).toBe(54);
    expect(view.getUint32(22 + 12, true)).toBe(63);
    expect(view.getUint32(38 + 12, true)).toBe(72);
    expect([...ico.slice(54, 62)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("rejects duplicate sizes and non-PNG payloads", () => {
    expect(() => createMultiSizeIco([{ size: 16, bytes: pngBytes(1) }, { size: 16, bytes: pngBytes(2) }])).toThrow("ซ้ำ");
    expect(() => createMultiSizeIco([{ size: 32, bytes: new Uint8Array([1, 2, 3]) }])).toThrow("ไม่ใช่ PNG");
  });
});

describe("manifest and HTML output", () => {
  it("builds a manifest with any and maskable icons", () => {
    const manifest = JSON.parse(buildWebManifest({
      name: "Meaw Tools",
      shortName: "Meaw",
      startUrl: "/tools/",
      themeColor: "#0f9f8f",
      backgroundColor: "#fffaf0",
    }));
    expect(manifest.start_url).toBe("/tools/");
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons[2]).toMatchObject({ sizes: "512x512", purpose: "maskable" });
    expect(buildFaviconHeadSnippet("#0f9f8f")).toContain('rel="apple-touch-icon" sizes="180x180"');
  });

  it("rejects external or protocol-relative start URLs", () => {
    expect(() => validateManifestPath("https://example.com")).toThrow("ภายในเว็บไซต์");
    expect(() => validateManifestPath("//example.com/app")).toThrow("ภายในเว็บไซต์");
    expect(() => validateManifestPath("/app/#!/home")).not.toThrow();
  });
});
