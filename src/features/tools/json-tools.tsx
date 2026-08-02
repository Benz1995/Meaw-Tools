"use client";

import { Braces, CheckCircle2, Minimize2, Play, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CodeEditor } from "@/components/editor/code-editor";
import { ActionBar, ClearButton, CopyButton, DownloadButton, EmptyOutput, ExampleButton, PanelLabel, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { byteSize } from "@/lib/tools/limits";
import { formatJson, minifyJson, validateJson, type JsonValidation } from "@/lib/tools/json";

const formatterExample = '{"name":"Benz","skills":["PHP","Next.js","SQL"]}';
export function JsonFormatterTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [indent, setIndent] = useState<2 | 4>(2); const [error, setError] = useState("");
  const run = (mode: "format" | "minify") => { if (!input.trim()) { setError("กรุณาวาง JSON หรือกดตัวอย่าง"); return; } try { const result = mode === "format" ? formatJson(input, indent) : minifyJson(input); setOutput(result); setError(""); toast.success(mode === "format" ? "จัดรูป JSON แล้ว" : "ย่อ JSON แล้ว"); } catch (caught) { setError(caught instanceof Error ? caught.message : "JSON ไม่ถูกต้อง"); setOutput(""); } };
  const clear = () => { setInput(""); setOutput(""); setError(""); };
  return <WorkspaceFrame><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><ActionBar><Button onClick={() => run("format")} aria-label="จัดรูป JSON"><Braces className="size-4"/>จัดรูป</Button><Button variant="secondary" onClick={() => run("minify")} aria-label="ย่อ JSON"><Minimize2 className="size-4"/>ย่อ</Button><ExampleButton onExample={() => setInput(formatterExample)} /><ClearButton onClear={clear}/><CopyButton value={output}/><DownloadButton value={output} filename="formatted.json" type="application/json"/></ActionBar><Select value={String(indent)} onValueChange={(value) => setIndent(value === "4" ? 4 : 2)}><SelectTrigger className="w-36" aria-label="จำนวนช่องว่าง indent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">Indent 2</SelectItem><SelectItem value="4">Indent 4</SelectItem></SelectContent></Select></div>{error ? <Alert variant="destructive" className="mb-4"><XCircle/><AlertTitle>JSON ไม่ถูกต้อง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="grid gap-4 lg:grid-cols-2"><div><PanelLabel meta={`${byteSize(input).toLocaleString()} bytes`}>Input</PanelLabel><CodeEditor value={input} onChange={setInput} language="json" label="JSON input" /></div><div><PanelLabel meta={`${byteSize(output).toLocaleString()} bytes`}>Output</PanelLabel>{output ? <CodeEditor value={output} language="json" readOnly label="JSON output" /> : <EmptyOutput />}</div></div></WorkspaceFrame>;
}

export function JsonValidatorTool() {
  const [input, setInput] = useState(""); const [result, setResult] = useState<JsonValidation | null>(null);
  const validate = () => { if (!input.trim()) { setResult({ valid: false, message: "กรุณาวาง JSON หรือกดตัวอย่าง" }); return; } const next = validateJson(input); setResult(next); if (next.valid) toast.success("JSON ถูกต้อง"); else toast.error("JSON ไม่ถูกต้อง"); };
  return <WorkspaceFrame><ActionBar><Button onClick={validate} aria-label="ตรวจสอบ JSON"><Play className="size-4"/>ตรวจสอบ</Button><ExampleButton onExample={() => { setInput('{"valid":true,"items":[1,2,3]}'); setResult(null); }}/><ClearButton onClear={() => { setInput(""); setResult(null); }}/>{result?.valid ? <CopyButton value={JSON.stringify(result.value, null, 2)} label="คัดลอก JSON"/> : null}</ActionBar><div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><div><PanelLabel>JSON Input</PanelLabel><CodeEditor value={input} onChange={setInput} language="json" label="JSON ที่ต้องการตรวจสอบ" /></div><div><PanelLabel>ผลการตรวจ</PanelLabel>{!result ? <EmptyOutput text="สถานะและสถิติ JSON จะแสดงที่นี่"/> : result.valid ? <Alert className="min-h-72 border-green-500/30 bg-green-500/5"><CheckCircle2 className="text-green-600"/><AlertTitle>JSON ถูกต้อง</AlertTitle><AlertDescription className="mt-5 grid gap-3 text-foreground"><p>Object <strong>{result.stats.objects}</strong></p><p>Array <strong>{result.stats.arrays}</strong></p><p>Key <strong>{result.stats.keys}</strong></p></AlertDescription></Alert> : <Alert variant="destructive" className="min-h-72"><XCircle/><AlertTitle>JSON ไม่ถูกต้อง</AlertTitle><AlertDescription className="space-y-2"><p>{result.message}</p>{result.line ? <p>บรรทัด {result.line}, คอลัมน์ {result.column}</p> : null}</AlertDescription></Alert>}</div></div></WorkspaceFrame>;
}
