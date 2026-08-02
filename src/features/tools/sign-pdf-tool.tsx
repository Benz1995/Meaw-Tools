"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, FileCheck2, FilePenLine, ImagePlus, PenLine, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, downloadBlob } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PDF_SIGNATURE_PAGE_LIMIT,
  PDF_SIGNATURE_PLACEMENT_LIMIT,
  clampSignaturePlacement,
  createCenteredSignaturePlacement,
  mapSignaturePlacementToPdf,
  signedPdfFilename,
  validateSignatureImage,
  type PdfSignaturePlacement,
} from "@/lib/tools/pdf-signature";
import { formatPdfBytes, validatePdfFile } from "@/lib/tools/pdf";

type PdfPreview = { pageIndex: number; url: string; width: number; height: number; rotation: number };
type SignatureAsset = { blob: Blob; url: string; width: number; height: number; source: "draw" | "upload" };
type SignedPdfOutput = { blob: Blob; filename: string; bytes: number; placements: number; pages: number };
type PlacementInteraction = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  placement: PdfSignaturePlacement;
};

const SIGNATURE_COLORS = ["#172a46", "#111827", "#1f5f46"] as const;
const SIGNATURE_WIDTHS = [2, 4, 7] as const;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

function friendlyPdfError(caught: unknown, fallback: string): string {
  if (caught && typeof caught === "object" && "name" in caught) {
    if (caught.name === "PasswordException" || caught.name === "EncryptedPDFError") return "PDF มีรหัสผ่าน กรุณาปลดล็อกไฟล์ก่อนนำมาเซ็น";
    if (caught.name === "InvalidPDFException") return "ไฟล์ PDF เสียหายหรือรูปแบบไม่ถูกต้อง";
  }
  return caught instanceof Error ? caught.message : fallback;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Browser ไม่สามารถสร้างรูปลายเซ็น PNG ได้")), "image/png");
  });
}

async function processSignatureBlob(blob: Blob, removeWhite: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 1_600 / Math.max(bitmap.width, bitmap.height));
    const source = document.createElement("canvas");
    source.width = Math.max(1, Math.round(bitmap.width * scale));
    source.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = source.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Browser ไม่รองรับ Canvas สำหรับรูปลายเซ็น");
    context.drawImage(bitmap, 0, 0, source.width, source.height);
    const imageData = context.getImageData(0, 0, source.width, source.height);
    const pixels = imageData.data;
    let left = source.width;
    let top = source.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const offset = (y * source.width + x) * 4;
        if (removeWhite) {
          const brightness = (pixels[offset]! + pixels[offset + 1]! + pixels[offset + 2]!) / 3;
          if (brightness >= 246) pixels[offset + 3] = 0;
          else if (brightness > 215) pixels[offset + 3] = Math.round(pixels[offset + 3]! * ((246 - brightness) / 31));
        }
        if (pixels[offset + 3]! > 12) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    }
    context.putImageData(imageData, 0, 0);
    if (right < left || bottom < top) throw new Error("ไม่พบเส้นลายเซ็นในรูป กรุณาใช้รูปที่เข้มขึ้นหรือปิดการลบพื้นขาว");

    const padding = 8;
    const cropLeft = Math.max(0, left - padding);
    const cropTop = Math.max(0, top - padding);
    const cropRight = Math.min(source.width, right + padding + 1);
    const cropBottom = Math.min(source.height, bottom + padding + 1);
    const output = document.createElement("canvas");
    output.width = cropRight - cropLeft;
    output.height = cropBottom - cropTop;
    const outputContext = output.getContext("2d");
    if (!outputContext) throw new Error("Browser ไม่สามารถครอปรูปลายเซ็นได้");
    outputContext.drawImage(source, cropLeft, cropTop, output.width, output.height, 0, 0, output.width, output.height);
    return { blob: await canvasToPng(output), width: output.width, height: output.height };
  } finally {
    bitmap.close();
  }
}

async function createSamplePdf(): Promise<File> {
  const { PDFDocument, PageSizes, StandardFonts, degrees, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const colors = { ink: rgb(0.13, 0.18, 0.16), accent: rgb(0.14, 0.43, 0.31), line: rgb(0.78, 0.84, 0.8) };
  const first = pdf.addPage(PageSizes.A4);
  first.drawText("SERVICE AGREEMENT", { x: 52, y: 770, size: 22, font: bold, color: colors.accent });
  first.drawText("Meaw Cafe website maintenance", { x: 52, y: 730, size: 13, font: bold, color: colors.ink });
  first.drawText("Please review the scope and add your signature below.", { x: 52, y: 704, size: 11, font: regular, color: colors.ink });
  first.drawLine({ start: { x: 52, y: 170 }, end: { x: 270, y: 170 }, thickness: 0.7, color: colors.line });
  first.drawText("Authorized signature", { x: 52, y: 150, size: 10, font: regular, color: colors.ink });

  const second = pdf.addPage(PageSizes.A4);
  second.setRotation(degrees(90));
  second.drawText("APPENDIX - ROTATED PAGE", { x: 52, y: 770, size: 22, font: bold, color: colors.accent });
  second.drawText("This page verifies signature placement on a rotated PDF page.", { x: 52, y: 730, size: 11, font: regular, color: colors.ink });
  second.drawLine({ start: { x: 52, y: 170 }, end: { x: 270, y: 170 }, thickness: 0.7, color: colors.line });
  pdf.setTitle("Meaw Tools sign PDF sample");
  pdf.setCreator("Meaw Tools");
  return new File([Uint8Array.from(await pdf.save())], "meaw-sign-pdf-sample.pdf", { type: "application/pdf", lastModified: Date.now() });
}

async function createSampleSignature(): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ไม่รองรับ Canvas");
  context.strokeStyle = "#172a46";
  context.fillStyle = "#172a46";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 6;
  context.font = "italic 112px cursive";
  context.fillText("Meaw", 70, 155);
  context.beginPath();
  context.moveTo(58, 178);
  context.bezierCurveTo(210, 205, 430, 180, 650, 190);
  context.stroke();
  return processSignatureBlob(await canvasToPng(canvas), false);
}

export function SignPdfTool() {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const pdfTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const previewUrlRef = useRef("");
  const signatureUrlRef = useRef("");
  const selectionRef = useRef(0);
  const renderRef = useRef(0);
  const generationRef = useRef(0);
  const drawingRef = useRef<{ pointerId: number } | null>(null);
  const interactionRef = useRef<PlacementInteraction | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [signature, setSignature] = useState<SignatureAsset | null>(null);
  const [placements, setPlacements] = useState<PdfSignaturePlacement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [inkColor, setInkColor] = useState<(typeof SIGNATURE_COLORS)[number]>(SIGNATURE_COLORS[0]);
  const [inkWidth, setInkWidth] = useState<(typeof SIGNATURE_WIDTHS)[number]>(SIGNATURE_WIDTHS[1]);
  const [hasInk, setHasInk] = useState(false);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [reading, setReading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<SignedPdfOutput | null>(null);

  const invalidateOutput = () => {
    generationRef.current += 1;
    setProcessing(false);
    setOutput(null);
    setError("");
  };

  const replacePreviewUrl = (url: string) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
  };

  const replaceSignature = (asset: SignatureAsset | null) => {
    if (signatureUrlRef.current) URL.revokeObjectURL(signatureUrlRef.current);
    signatureUrlRef.current = asset?.url ?? "";
    setSignature(asset);
    setPlacements([]);
    setSelectedPlacementId("");
    invalidateOutput();
  };

  useEffect(() => () => {
    selectionRef.current += 1;
    generationRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (signatureUrlRef.current) URL.revokeObjectURL(signatureUrlRef.current);
    void pdfTaskRef.current?.destroy();
  }, []);

  const renderPage = async (pageIndex: number, documentProxy = pdfDocumentRef.current, selection = selectionRef.current): Promise<PdfPreview | null> => {
    if (!documentProxy) return null;
    const render = ++renderRef.current;
    setRendering(true);
    try {
      const page = await documentProxy.getPage(pageIndex + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.6, 1_050 / baseViewport.width, 1_300 / baseViewport.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Browser ไม่รองรับ Canvas สำหรับตัวอย่าง PDF");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const url = URL.createObjectURL(await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("สร้างตัวอย่าง PDF ไม่สำเร็จ")), "image/jpeg", 0.9)));
      const nextPreview = { pageIndex, url, width: canvas.width, height: canvas.height, rotation: page.rotate };
      page.cleanup();
      if (selection !== selectionRef.current || render !== renderRef.current) {
        URL.revokeObjectURL(url);
        return null;
      }
      replacePreviewUrl(url);
      setPreview(nextPreview);
      setCurrentPage(pageIndex);
      return nextPreview;
    } finally {
      if (selection === selectionRef.current && render === renderRef.current) setRendering(false);
    }
  };

  const selectPdf = async (nextFile: File): Promise<PdfPreview | null> => {
    const selection = ++selectionRef.current;
    generationRef.current += 1;
    renderRef.current += 1;
    setReading(true);
    setRendering(false);
    setProcessing(false);
    setError("");
    setOutput(null);
    setFile(null);
    setPageCount(0);
    setCurrentPage(0);
    setPreview(null);
    setPlacements([]);
    setSelectedPlacementId("");
    replacePreviewUrl("");
    const previousTask = pdfTaskRef.current;
    pdfDocumentRef.current = null;
    pdfTaskRef.current = null;
    if (previousTask) await previousTask.destroy();
    let loadingTask: PDFDocumentLoadingTask | null = null;
    try {
      validatePdfFile(nextFile);
      const pdfjs = await loadPdfJs();
      loadingTask = pdfjs.getDocument({ data: new Uint8Array(await nextFile.arrayBuffer()) });
      const documentProxy = await loadingTask.promise;
      if (documentProxy.numPages > PDF_SIGNATURE_PAGE_LIMIT) {
        await loadingTask.destroy();
        loadingTask = null;
        throw new Error(`เซ็น PDF ได้สูงสุด ${PDF_SIGNATURE_PAGE_LIMIT} หน้าต่อไฟล์`);
      }
      if (selection !== selectionRef.current) {
        await loadingTask.destroy();
        loadingTask = null;
        return null;
      }
      pdfDocumentRef.current = documentProxy;
      pdfTaskRef.current = loadingTask;
      setFile(nextFile);
      setPageCount(documentProxy.numPages);
      return await renderPage(0, documentProxy, selection);
    } catch (caught) {
      if (loadingTask && pdfTaskRef.current !== loadingTask) await loadingTask.destroy();
      if (loadingTask && pdfTaskRef.current === loadingTask) {
        pdfTaskRef.current = null;
        pdfDocumentRef.current = null;
        await loadingTask.destroy();
      }
      if (selection === selectionRef.current) {
        setError(friendlyPdfError(caught, "อ่านไฟล์ PDF ไม่สำเร็จ"));
        if (pdfInputRef.current) pdfInputRef.current.value = "";
      }
      return null;
    } finally {
      if (selection === selectionRef.current) setReading(false);
    }
  };

  const changePage = async (nextPage: number) => {
    const normalized = Math.min(pageCount - 1, Math.max(0, nextPage));
    if (!pdfDocumentRef.current || normalized === currentPage) return;
    setSelectedPlacementId("");
    setError("");
    try {
      await renderPage(normalized);
    } catch (caught) {
      setError(friendlyPdfError(caught, `สร้างตัวอย่างหน้า ${normalized + 1} ไม่สำเร็จ`));
    }
  };

  const selectSignatureFile = async (nextFile: File) => {
    try {
      validateSignatureImage(nextFile);
      const processed = await processSignatureBlob(nextFile, removeWhite);
      const url = URL.createObjectURL(processed.blob);
      replaceSignature({ ...processed, url, source: "upload" });
      toast.success("เตรียมรูปลายเซ็นแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "อ่านรูปลายเซ็นไม่สำเร็จ");
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  const pointOnDrawCanvas = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };

  const beginDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = { pointerId: event.pointerId };
    const point = pointOnDrawCanvas(event);
    context.strokeStyle = inkColor;
    context.lineWidth = inkWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current?.pointerId !== event.pointerId) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointOnDrawCanvas(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const endDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current?.pointerId !== event.pointerId) return;
    drawingRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const applyDrawnSignature = async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !hasInk) { setError("กรุณาวาดลายเซ็นก่อนกดใช้งาน"); return; }
    try {
      const processed = await processSignatureBlob(await canvasToPng(canvas), false);
      replaceSignature({ ...processed, url: URL.createObjectURL(processed.blob), source: "draw" });
      toast.success("ใช้ลายเซ็นที่วาดแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เตรียมลายเซ็นที่วาดไม่สำเร็จ");
    }
  };

  const addPlacement = () => {
    if (!signature || !preview) { setError(!signature ? "กรุณาวาดหรืออัปโหลดลายเซ็นก่อน" : "กรุณาเลือกไฟล์ PDF ก่อน"); return; }
    if (placements.length >= PDF_SIGNATURE_PLACEMENT_LIMIT) { setError(`วางลายเซ็นได้สูงสุด ${PDF_SIGNATURE_PLACEMENT_LIMIT} ตำแหน่งต่อไฟล์`); return; }
    const placement = createCenteredSignaturePlacement({
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      signatureWidth: signature.width,
      signatureHeight: signature.height,
      displayWidth: preview.width,
      displayHeight: preview.height,
    });
    setPlacements((current) => [...current, placement]);
    setSelectedPlacementId(placement.id);
    invalidateOutput();
  };

  const updatePlacement = (id: string, update: (placement: PdfSignaturePlacement) => PdfSignaturePlacement) => {
    setPlacements((current) => current.map((placement) => placement.id === id ? clampSignaturePlacement(update(placement)) : placement));
    setOutput(null);
  };

  const removePlacement = (id: string) => {
    setPlacements((current) => current.filter((placement) => placement.id !== id));
    setSelectedPlacementId((current) => current === id ? "" : current);
    invalidateOutput();
  };

  const beginPlacementInteraction = (event: ReactPointerEvent<HTMLElement>, placement: PdfSignaturePlacement, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = { id: placement.id, mode, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, placement };
    setSelectedPlacementId(placement.id);
    invalidateOutput();
  };

  const continuePlacementInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current;
    const stage = event.currentTarget.closest("[data-signature-stage]");
    if (!interaction || interaction.pointerId !== event.pointerId || !(stage instanceof HTMLElement)) return;
    const bounds = stage.getBoundingClientRect();
    const deltaX = (event.clientX - interaction.startX) / bounds.width;
    const deltaY = (event.clientY - interaction.startY) / bounds.height;
    updatePlacement(interaction.id, () => {
      if (interaction.mode === "move") return { ...interaction.placement, x: interaction.placement.x + deltaX, y: interaction.placement.y + deltaY };
      const width = interaction.placement.width + deltaX;
      const ratio = interaction.placement.height / interaction.placement.width;
      return { ...interaction.placement, width, height: width * ratio };
    });
  };

  const endPlacementInteraction = (event: ReactPointerEvent<HTMLElement>) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePlacementKey = (event: React.KeyboardEvent<HTMLDivElement>, placement: PdfSignaturePlacement) => {
    const step = event.shiftKey ? 0.03 : 0.01;
    const deltas: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removePlacement(placement.id);
      return;
    }
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    updatePlacement(placement.id, (current) => ({ ...current, x: current.x + delta[0], y: current.y + delta[1] }));
    invalidateOutput();
  };

  const exportSignedPdf = async () => {
    if (!file) { setError("กรุณาเลือกไฟล์ PDF"); return; }
    if (!signature) { setError("กรุณาวาดหรืออัปโหลดลายเซ็น"); return; }
    if (!placements.length) { setError("กรุณาวางลายเซ็นบนเอกสารอย่างน้อย 1 ตำแหน่ง"); return; }
    const generation = ++generationRef.current;
    setProcessing(true);
    setError("");
    setOutput(null);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      if (pdf.getPageCount() !== pageCount) throw new Error("จำนวนหน้า PDF เปลี่ยนแปลง กรุณาเลือกไฟล์ใหม่อีกครั้ง");
      const signatureImage = await pdf.embedPng(await signature.blob.arrayBuffer());
      for (const placement of placements) {
        const page = pdf.getPage(placement.pageIndex);
        if (!page) throw new Error(`ไม่พบหน้า ${placement.pageIndex + 1} ใน PDF`);
        const size = page.getSize();
        const draw = mapSignaturePlacementToPdf(placement, size.width, size.height, page.getRotation().angle);
        page.drawImage(signatureImage, {
          x: draw.x,
          y: draw.y,
          width: draw.width,
          height: draw.height,
          rotate: degrees(draw.rotation),
          opacity: draw.opacity,
        });
      }
      const blob = new Blob([Uint8Array.from(await pdf.save())], { type: "application/pdf" });
      if (generationRef.current !== generation) return;
      const nextOutput = { blob, filename: signedPdfFilename(file.name), bytes: blob.size, placements: placements.length, pages: pageCount };
      setOutput(nextOutput);
      downloadBlob(blob, nextOutput.filename);
      toast.success(`เซ็น PDF สำเร็จ ${placements.length} ตำแหน่ง`);
    } catch (caught) {
      if (generationRef.current === generation) setError(friendlyPdfError(caught, "สร้าง PDF ที่เซ็นแล้วไม่สำเร็จ"));
    } finally {
      if (generationRef.current === generation) setProcessing(false);
    }
  };

  const loadExample = async () => {
    try {
      const [samplePdf, sampleSignature] = await Promise.all([createSamplePdf(), createSampleSignature()]);
      const loadedPreview = await selectPdf(samplePdf);
      if (!loadedPreview) return;
      const asset: SignatureAsset = { ...sampleSignature, url: URL.createObjectURL(sampleSignature.blob), source: "draw" };
      replaceSignature(asset);
      const placement = createCenteredSignaturePlacement({
        id: "example-signature",
        pageIndex: 0,
        signatureWidth: asset.width,
        signatureHeight: asset.height,
        displayWidth: loadedPreview.width,
        displayHeight: loadedPreview.height,
      });
      setPlacements([placement]);
      setSelectedPlacementId(placement.id);
      toast.success("โหลด PDF และลายเซ็นตัวอย่างแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "โหลดตัวอย่างไม่สำเร็จ");
    }
  };

  const clearAll = () => {
    selectionRef.current += 1;
    renderRef.current += 1;
    generationRef.current += 1;
    void pdfTaskRef.current?.destroy();
    pdfDocumentRef.current = null;
    pdfTaskRef.current = null;
    replacePreviewUrl("");
    if (signatureUrlRef.current) URL.revokeObjectURL(signatureUrlRef.current);
    signatureUrlRef.current = "";
    setFile(null);
    setPageCount(0);
    setCurrentPage(0);
    setPreview(null);
    setSignature(null);
    setPlacements([]);
    setSelectedPlacementId("");
    setReading(false);
    setRendering(false);
    setProcessing(false);
    setError("");
    setOutput(null);
    clearDrawing();
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  };

  const currentPlacements = placements.filter((placement) => placement.pageIndex === currentPage);
  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const placementPages = [...new Set(placements.map((placement) => placement.pageIndex))]
    .sort((left, right) => left - right)
    .map((pageIndex) => ({
      pageIndex,
      count: placements.filter((placement) => placement.pageIndex === pageIndex).length,
    }));

  const jumpToPage = (input: HTMLInputElement) => {
    const requestedPage = Number.parseInt(input.value, 10);
    if (!Number.isFinite(requestedPage)) {
      input.value = String(currentPage + 1);
      return;
    }
    const normalizedPage = Math.min(pageCount, Math.max(1, requestedPage));
    input.value = String(normalizedPage);
    void changePage(normalizedPage - 1);
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <ShieldCheck className="text-sky-600" />
        <AlertTitle>PDF และลายเซ็นอยู่ใน Browser ของคุณ</AlertTitle>
        <AlertDescription>เครื่องมือนี้ไม่อัปโหลดเอกสารหรือลายเซ็นขึ้น Server และสร้างไฟล์ใหม่ในอุปกรณ์ของคุณ ลายเซ็นที่วางเป็นรูปภาพ ไม่ใช่ digital certificate หรือการยืนยันตัวตน</AlertDescription>
      </Alert>

      <section className="space-y-2.5" aria-labelledby="sign-pdf-file-title">
        <Label id="sign-pdf-file-title" htmlFor="sign-pdf-file">1. เลือกไฟล์ PDF</Label>
        <Input ref={pdfInputRef} id="sign-pdf-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { const nextFile = event.target.files?.[0]; if (nextFile) void selectPdf(nextFile); }} />
        <p className="text-xs leading-5 text-muted-foreground">ไฟล์ไม่เกิน 30 MB · สูงสุด {PDF_SIGNATURE_PAGE_LIMIT} หน้า · ไม่รองรับ PDF ที่ล็อกด้วยรหัสผ่าน</p>
      </section>

      {file ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3" data-testid="sign-pdf-file-summary">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{pageCount} หน้า · {formatPdfBytes(file.size)}</p></div>
          <div className="flex items-center gap-2"><Button type="button" size="icon-sm" variant="outline" aria-label="หน้าก่อนหน้า" disabled={currentPage === 0 || rendering} onClick={() => void changePage(currentPage - 1)}><ChevronLeft /></Button><span className="text-xs font-medium">หน้า</span><Input key={currentPage} type="number" min={1} max={pageCount} defaultValue={currentPage + 1} aria-label="ไปยังหน้า PDF" className="h-8 w-16 text-center text-xs tabular-nums" disabled={rendering} onBlur={(event) => jumpToPage(event.currentTarget)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span className="text-xs font-medium tabular-nums">/ {pageCount}</span><Button type="button" size="icon-sm" variant="outline" aria-label="หน้าถัดไป" disabled={currentPage >= pageCount - 1 || rendering} onClick={() => void changePage(currentPage + 1)}><ChevronRight /></Button></div>
        </div>
      ) : null}

      {reading ? <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-sm" aria-live="polite">กำลังอ่าน PDF และสร้างตัวอย่างหน้า...</div> : null}

      <section className="mt-6 border-t pt-6" aria-labelledby="signature-source-title">
        <div className="mb-4 flex items-center gap-2"><PenLine className="size-4 text-primary" /><h2 id="signature-source-title" className="text-base font-semibold">2. สร้างลายเซ็น</h2></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">วาดลายเซ็น</p><div className="flex items-center gap-2" aria-label="ตั้งค่าปากกา">{SIGNATURE_COLORS.map((color) => <button key={color} type="button" className={`size-7 rounded-full border-2 ${inkColor === color ? "border-primary ring-2 ring-primary/20" : "border-background"}`} style={{ backgroundColor: color }} onClick={() => setInkColor(color)} aria-label={`สีปากกา ${color}`} />)}{SIGNATURE_WIDTHS.map((width) => <button key={width} type="button" className={`grid size-7 place-items-center rounded-md border ${inkWidth === width ? "border-primary bg-primary/10" : "bg-background"}`} onClick={() => setInkWidth(width)} aria-label={`ความหนาปากกา ${width}`}><span className="rounded-full bg-foreground" style={{ width: Math.max(4, width + 2), height: Math.max(4, width + 2) }} /></button>)}</div></div>
            <canvas ref={drawCanvasRef} width={720} height={240} className="h-44 w-full touch-none rounded-lg border bg-white shadow-inner" aria-label="พื้นที่วาดลายเซ็น" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerCancel={endDrawing} />
            <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => void applyDrawnSignature()} disabled={!hasInk}><PenLine />ใช้ลายเซ็นที่วาด</Button><Button type="button" size="sm" variant="outline" onClick={clearDrawing}>ล้างเส้นวาด</Button></div>
          </div>

          <div className="rounded-xl border bg-muted/10 p-4">
            <p className="text-sm font-semibold">อัปโหลดรูปลายเซ็น</p>
            <div className="mt-3 space-y-2.5"><Label htmlFor="signature-image">รูป PNG, JPG หรือ WebP</Label><Input ref={signatureInputRef} id="signature-image" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => { const nextFile = event.target.files?.[0]; if (nextFile) void selectSignatureFile(nextFile); }} /></div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={removeWhite} onChange={(event) => setRemoveWhite(event.target.checked)} className="mt-1 size-4 accent-primary" /><span><span className="font-medium">ลบพื้นขาวอัตโนมัติ</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">เหมาะกับรูปลายเซ็นที่ถ่ายจากกระดาษ ปิดตัวเลือกนี้เมื่อรูปมีพื้นหลังที่ต้องการเก็บไว้</span></span></label>
            <div className="mt-4 grid min-h-36 place-items-center rounded-lg border border-dashed bg-white/70 p-4">
              {signature ? <div className="text-center"><div className="relative mx-auto h-20 w-56"><Image unoptimized fill src={signature.url} alt="ตัวอย่างลายเซ็น" className="object-contain" /></div><p className="mt-2 text-xs text-muted-foreground">{signature.source === "draw" ? "ลายเซ็นที่วาด" : "รูปลายเซ็นที่อัปโหลด"} · {signature.width}×{signature.height}px</p></div> : <div className="text-center text-sm text-muted-foreground"><ImagePlus className="mx-auto mb-2 size-6" />ยังไม่มีลายเซ็น</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 border-t pt-6" aria-labelledby="signature-placement-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePenLine className="size-4 text-primary" /><h2 id="signature-placement-title" className="text-base font-semibold">3. วางลายเซ็นบน PDF</h2></div><span className="text-xs text-muted-foreground">{placements.length}/{PDF_SIGNATURE_PLACEMENT_LIMIT} ตำแหน่ง</span></div>
        <div className="mb-4 flex flex-wrap items-center gap-2"><Button type="button" onClick={addPlacement} disabled={!signature || !preview || rendering}><Plus />วางลายเซ็นในหน้านี้</Button>{selectedPlacement ? <Button type="button" variant="destructive" onClick={() => removePlacement(selectedPlacement.id)}><Trash2 />ลบตำแหน่งที่เลือก</Button> : null}</div>
        {placementPages.length ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2" data-testid="sign-pdf-placement-pages"><span className="mr-1 text-xs font-medium text-muted-foreground">วางแล้ว:</span>{placementPages.map(({ pageIndex, count }) => <Button key={pageIndex} type="button" size="sm" variant={pageIndex === currentPage ? "secondary" : "outline"} className="h-7 px-2.5 text-xs" onClick={() => void changePage(pageIndex)}>หน้า {pageIndex + 1} ({count})</Button>)}</div> : null}

        {preview ? (
          <div className="rounded-xl border bg-muted/20 p-3 sm:p-5" data-testid="sign-pdf-workspace">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">ลากลายเซ็นเพื่อย้าย ใช้จุดมุมขวาล่างเพื่อย่อขยาย หรือใช้ปุ่มลูกศรบนคีย์บอร์ดเพื่อขยับอย่างละเอียด</p>
            <div className="mx-auto w-full max-w-[820px]">
              <div data-signature-stage className="relative w-full overflow-hidden rounded-md border bg-white shadow-sm" style={{ aspectRatio: `${preview.width} / ${preview.height}` }}>
                <Image unoptimized fill priority src={preview.url} alt={`ตัวอย่าง PDF หน้า ${currentPage + 1}`} className="object-fill" />
                {currentPlacements.map((placement) => (
                  <div
                    key={placement.id}
                    role="group"
                    tabIndex={0}
                    aria-label={`ลายเซ็นหน้า ${placement.pageIndex + 1}`}
                    data-testid="signature-placement"
                    className={`absolute touch-none select-none outline-none ${selectedPlacementId === placement.id ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-emerald-600/70"}`}
                    style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.width * 100}%`, height: `${placement.height * 100}%` }}
                    onPointerDown={(event) => beginPlacementInteraction(event, placement, "move")}
                    onPointerMove={continuePlacementInteraction}
                    onPointerUp={endPlacementInteraction}
                    onPointerCancel={endPlacementInteraction}
                    onKeyDown={(event) => handlePlacementKey(event, placement)}
                    onFocus={() => setSelectedPlacementId(placement.id)}
                  >
                    {signature ? <Image unoptimized fill src={signature.url} alt="" className="pointer-events-none object-fill" style={{ opacity: placement.opacity }} /> : null}
                    <button type="button" aria-label="ย่อขยายลายเซ็น" className="absolute -bottom-2 -right-2 size-6 cursor-se-resize rounded-full border-2 border-white bg-primary shadow" onPointerDown={(event) => beginPlacementInteraction(event, placement, "resize")} onPointerMove={continuePlacementInteraction} onPointerUp={endPlacementInteraction} onPointerCancel={endPlacementInteraction} />
                  </div>
                ))}
                {rendering ? <div className="absolute inset-0 grid place-items-center bg-white/80 text-sm">กำลังเปลี่ยนหน้า...</div> : null}
              </div>
            </div>
          </div>
        ) : !reading ? <EmptyOutput size="compact" text="เลือก PDF แล้ววาดหรืออัปโหลดลายเซ็นเพื่อเริ่มวางบนเอกสาร" /> : null}

        {selectedPlacement ? (
          <div className="mt-4 grid gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2.5"><Label htmlFor="signature-opacity">ความทึบของลายเซ็น: {Math.round(selectedPlacement.opacity * 100)}%</Label><input id="signature-opacity" type="range" min="20" max="100" step="5" value={Math.round(selectedPlacement.opacity * 100)} onChange={(event) => { const opacity = Number(event.target.value) / 100; updatePlacement(selectedPlacement.id, (placement) => ({ ...placement, opacity })); invalidateOutput(); }} className="w-full accent-primary" /></div>
            <p className="text-xs text-muted-foreground">อยู่หน้า {selectedPlacement.pageIndex + 1}</p>
          </div>
        ) : null}
      </section>

      {error ? <p role="alert" className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 border-t pt-5">
        <ActionBar><Button type="button" onClick={() => void exportSignedPdf()} disabled={processing || reading || rendering}><Download />{processing ? "กำลังสร้าง PDF..." : "เซ็นและดาวน์โหลด PDF"}</Button><ExampleButton onExample={() => void loadExample()} /><ClearButton onClear={clearAll} /></ActionBar>
      </div>

      {output ? (
        <div data-testid="sign-pdf-output" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5" aria-live="polite">
          <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300"><FileCheck2 className="size-4" />เซ็น PDF สำเร็จ</p>
          <p className="mt-1 text-sm text-muted-foreground">{output.pages} หน้า · {output.placements} ตำแหน่ง · {formatPdfBytes(output.bytes)}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => downloadBlob(output.blob, output.filename)}><Download />ดาวน์โหลดอีกครั้ง</Button>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">ข้อจำกัดที่ควรรู้</p>
        <p>การวางรูปลายเซ็นไม่ยืนยันตัวตน เวลา หรือความยินยอม และไม่เท่ากับลายเซ็นดิจิทัลที่มี certificate การแก้ไข PDF ที่มีลายเซ็นดิจิทัลเดิมอาจทำให้การตรวจสอบลายเซ็นนั้นไม่ผ่าน ควรเปิดไฟล์ใหม่ตรวจทุกหน้าก่อนส่งหรือใช้เป็นหลักฐาน</p>
      </div>
    </WorkspaceFrame>
  );
}
