import { describe, expect, it } from "vitest";
import {
  SPEECH_TEXT_LIMIT,
  countSpeechCharacters,
  detectSpeechLanguage,
  estimateSpeechSeconds,
  filterSpeechVoices,
  formatSpeechDuration,
  getSpeechVoiceId,
  normalizeSpeechText,
  splitSpeechText,
  validateSpeechText,
} from "@/lib/tools/text-to-speech";

describe("text to speech helpers", () => {
  it("normalizes and validates text", () => {
    expect(normalizeSpeechText(" สวัสดี  \r\n\r\n\r\nโลก ")).toBe("สวัสดี\n\nโลก");
    expect(validateSpeechText("  Hello  ")).toBe("Hello");
    expect(() => validateSpeechText(" ")).toThrow("กรุณาใส่ข้อความ");
    expect(() => validateSpeechText("ก".repeat(SPEECH_TEXT_LIMIT + 1))).toThrow("20,000");
  });

  it("counts graphemes and detects Thai or English", () => {
    expect(countSpeechCharacters("กำ")).toBe(1);
    expect(detectSpeechLanguage("สวัสดี Meaw")).toBe("th-TH");
    expect(detectSpeechLanguage("Hello Meaw")).toBe("en-US");
  });

  it("splits sentences and long Thai text into safe chunks", () => {
    expect(splitSpeechText("ประโยคแรกครับ. ประโยคที่สองครับ.")).toHaveLength(2);
    const chunks = splitSpeechText("แมว".repeat(120), 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true);
    expect(chunks.join("")).toBe("แมว".repeat(120));
  });

  it("estimates and formats playback duration", () => {
    expect(estimateSpeechSeconds("ก".repeat(130), 1)).toBe(10);
    expect(estimateSpeechSeconds("ก".repeat(130), 2)).toBe(5);
    expect(formatSpeechDuration(90)).toBe("1:30");
  });

  it("sorts and filters browser voices without hiding all fallbacks", () => {
    const voices = [
      { voiceURI: "eng", name: "English", lang: "en-US", default: false, localService: true },
      { voiceURI: "tha", name: "Thai", lang: "th-TH", default: true, localService: false },
    ];
    expect(filterSpeechVoices(voices, "th-TH").map((voice) => voice.name)).toEqual(["Thai"]);
    expect(filterSpeechVoices(voices, "auto").map((voice) => voice.name)).toEqual(["Thai", "English"]);
    expect(filterSpeechVoices(voices, "ja-JP" as never)).toHaveLength(2);
    expect(getSpeechVoiceId(voices[0]!)).toBe("eng::en-US");
  });
});
