"use client";

import { Check, Clipboard, Download, Eraser, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export async function copyText(value: string, label = "คัดลอกแล้ว") {
  if (!value) { toast.error("ยังไม่มีผลลัพธ์ให้คัดลอก"); return; }
  await navigator.clipboard.writeText(value);
  toast.success(label, { icon: <Check className="size-4" /> });
}

export function downloadText(value: string, filename: string, type = "text/plain;charset=utf-8") {
  if (!value) { toast.error("ยังไม่มีผลลัพธ์ให้ดาวน์โหลด"); return; }
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
  toast.success("ดาวน์โหลดสำเร็จ");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function CopyButton({ value, label = "คัดลอก" }: { value: string; label?: string }) { return <Button type="button" variant="outline" onClick={() => void copyText(value)} aria-label={label}><Clipboard className="size-4" />{label}</Button>; }
export function ClearButton({ onClear, disabled = false }: { onClear: () => void; disabled?: boolean }) { return <Button type="button" variant="outline" disabled={disabled} onClick={() => { onClear(); toast.info("ล้างข้อมูลแล้ว"); }} aria-label="ล้างข้อมูล"><Eraser className="size-4" />ล้าง</Button>; }
export function ExampleButton({ onExample, disabled = false }: { onExample: () => void; disabled?: boolean }) { return <Button type="button" variant="outline" disabled={disabled} onClick={onExample} aria-label="โหลดตัวอย่าง"><FlaskConical className="size-4" />ตัวอย่าง</Button>; }
export function DownloadButton({ value, filename, type }: { value: string; filename: string; type?: string }) { return <Button type="button" variant="outline" onClick={() => downloadText(value, filename, type)} aria-label={`ดาวน์โหลด ${filename}`}><Download className="size-4" />ดาวน์โหลด</Button>; }

export function WorkspaceFrame({ children }: { children: React.ReactNode }) { return <div className="meaw-workspace-panel rounded-2xl border bg-card/90 p-4 shadow-sm sm:p-6">{children}</div>; }
export function ActionBar({ children }: { children: React.ReactNode }) { return <div className="flex flex-wrap gap-2">{children}</div>; }
export function PanelLabel({ children, meta }: { children: React.ReactNode; meta?: React.ReactNode }) { return <div className="mb-2 flex min-h-6 items-center justify-between gap-3"><h2 className="text-sm font-semibold">{children}</h2>{meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}</div>; }
export function EmptyOutput({ text = "ผลลัพธ์จะแสดงที่นี่หลังจากประมวลผล", size = "editor" }: { text?: string; size?: "compact" | "editor" }) { return <div className={`grid place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground ${size === "compact" ? "min-h-36" : "min-h-72"}`}>{text}</div>; }
