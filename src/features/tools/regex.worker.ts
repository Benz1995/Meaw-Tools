type Request = { pattern: string; flags: string; text: string; replacement: string };
self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const { pattern, flags, text, replacement } = event.data;
    const regex = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
    const matches: Array<{ value: string; index: number; groups: string[] }> = [];
    for (const match of text.matchAll(regex)) {
      matches.push({ value: match[0], index: match.index ?? 0, groups: match.slice(1).map((group) => group ?? "") });
      if (matches.length >= 500) break;
      if (match[0] === "") regex.lastIndex += 1;
    }
    const preview = replacement ? text.replace(regex, replacement) : "";
    self.postMessage({ ok: true, matches, preview });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : "Regex ไม่ถูกต้อง" });
  }
};
export {};
