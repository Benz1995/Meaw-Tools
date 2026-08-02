"use client";

import { AudioLines, Clock3, Gauge, Languages, Pause, Play, ShieldCheck, Square, TriangleAlert, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SPEECH_TEXT_LIMIT,
  type SpeechLanguage,
  countSpeechCharacters,
  detectSpeechLanguage,
  estimateSpeechSeconds,
  filterSpeechVoices,
  formatSpeechDuration,
  getSpeechVoiceId,
  splitSpeechText,
  validateSpeechText,
} from "@/lib/tools/text-to-speech";

type PlaybackStatus = "idle" | "speaking" | "paused" | "finished";

const exampleText = "สวัสดีค่ะ ยินดีต้อนรับสู่ Meaw Tools เครื่องมืออ่านข้อความเป็นเสียงสำหรับตรวจงาน ฝึกออกเสียง และฟังเนื้อหาสั้น ๆ ได้ฟรีจาก Browser ของคุณ\n\nHello! You can also paste English text and choose an English voice available on your device.";

function getPlaybackLabel(status: PlaybackStatus) {
  if (status === "speaking") return "กำลังอ่านข้อความ";
  if (status === "paused") return "พักการอ่านอยู่";
  if (status === "finished") return "อ่านจบแล้ว";
  return "พร้อมเริ่มอ่าน";
}

export function TextToSpeechTool() {
  const sessionRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<SpeechLanguage>("auto");
  const [voiceId, setVoiceId] = useState("default");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [activeSegment, setActiveSegment] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [currentSegment, setCurrentSegment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    if (!canSpeak) {
      queueMicrotask(() => { if (active) setSupported(false); });
      return () => { active = false; };
    }

    const synthesis = window.speechSynthesis;
    const loadVoices = () => { if (active) setVoices([...synthesis.getVoices()]); };
    queueMicrotask(loadVoices);
    synthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      active = false;
      sessionRef.current += 1;
      synthesis.cancel();
      synthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const characterCount = useMemo(() => countSpeechCharacters(text), [text]);
  const availableVoices = useMemo(() => filterSpeechVoices(voices, language), [language, voices]);
  const estimatedSeconds = characterCount > 0 ? estimateSpeechSeconds(text, rate) : 0;
  const isActive = status === "speaking" || status === "paused";
  const selectedVoice = voices.find((voice) => getSpeechVoiceId(voice) === voiceId) ?? null;
  const progress = segmentCount > 0
    ? status === "finished" ? 100 : Math.round(((activeSegment + 1) / segmentCount) * 100)
    : 0;

  const resetPlaybackState = (nextStatus: PlaybackStatus = "idle") => {
    setStatus(nextStatus);
    setActiveSegment(0);
    setSegmentCount(0);
    setCurrentSegment("");
  };

  const stopPlayback = (showToast = true) => {
    sessionRef.current += 1;
    utteranceRef.current = null;
    if (supported) window.speechSynthesis.cancel();
    resetPlaybackState();
    if (showToast) toast.info("หยุดอ่านข้อความแล้ว");
  };

  const startPlayback = () => {
    if (!supported) {
      setError("Browser นี้ไม่รองรับการอ่านข้อความเป็นเสียง กรุณาใช้ Chrome, Edge หรือ Safari เวอร์ชันปัจจุบัน");
      return;
    }

    let normalized = "";
    try {
      normalized = validateSpeechText(text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ข้อความไม่ถูกต้อง");
      return;
    }

    const segments = splitSpeechText(normalized);
    const synthesis = window.speechSynthesis;
    const session = ++sessionRef.current;
    const voice = voices.find((item) => getSpeechVoiceId(item) === voiceId) ?? null;
    synthesis.cancel();
    setError("");
    setStatus("speaking");
    setSegmentCount(segments.length);
    setActiveSegment(0);

    const speakAt = (index: number) => {
      if (session !== sessionRef.current) return;
      const segment = segments[index];
      if (!segment) {
        utteranceRef.current = null;
        setStatus("finished");
        setActiveSegment(Math.max(0, segments.length - 1));
        toast.success("อ่านข้อความจบแล้ว");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = voice?.lang || (language === "auto" ? detectSpeechLanguage(segment) : language);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (session !== sessionRef.current) return;
        setStatus("speaking");
        setActiveSegment(index);
        setCurrentSegment(segment);
      };
      utterance.onend = () => {
        if (session !== sessionRef.current) return;
        speakAt(index + 1);
      };
      utterance.onerror = (event) => {
        if (session !== sessionRef.current || event.error === "canceled" || event.error === "interrupted") return;
        utteranceRef.current = null;
        resetPlaybackState();
        setError(`Browser อ่านข้อความไม่สำเร็จ (${event.error}) ลองเปลี่ยนเสียงหรือเริ่มใหม่อีกครั้ง`);
      };
      utteranceRef.current = utterance;
      synthesis.speak(utterance);
    };

    speakAt(0);
  };

  const togglePause = () => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    if (status === "paused") {
      synthesis.resume();
      setStatus("speaking");
      return;
    }
    synthesis.pause();
    setStatus("paused");
  };

  const changeLanguage = (value: SpeechLanguage) => {
    setLanguage(value);
    if (voiceId === "default") return;
    const nextVoices = filterSpeechVoices(voices, value);
    if (!nextVoices.some((voice) => getSpeechVoiceId(voice) === voiceId)) setVoiceId("default");
  };

  const loadExample = () => {
    stopPlayback(false);
    setText(exampleText);
    setLanguage("auto");
    setVoiceId("default");
    setError("");
    toast.success("โหลดข้อความตัวอย่างแล้ว");
  };

  const clear = () => {
    stopPlayback(false);
    setText("");
    setError("");
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><AudioLines className="size-4 text-primary" /><h2 className="font-semibold">อ่านข้อความเป็นเสียง</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้เสียงภาษาไทยและอังกฤษที่ Browser หรือระบบปฏิบัติการมีให้</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ไม่ใช้ API Key</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="min-w-0 rounded-xl border bg-muted/10 p-4" aria-labelledby="tts-input-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="tts-input-title" className="text-sm font-semibold">ข้อความที่ต้องการฟัง</h3>
            <span className={`text-xs ${characterCount >= SPEECH_TEXT_LIMIT ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{characterCount.toLocaleString("th-TH")} / {SPEECH_TEXT_LIMIT.toLocaleString("th-TH")} ตัวอักษร</span>
          </div>
          <div className="mt-4 space-y-2.5">
            <Label htmlFor="tts-text">ข้อความที่ต้องการให้อ่าน</Label>
            <Textarea id="tts-text" value={text} onChange={(event) => { setText(event.target.value); setError(""); if (status === "finished") resetPlaybackState(); }} maxLength={SPEECH_TEXT_LIMIT} disabled={isActive} placeholder="วางบทความ ประโยคภาษาไทย หรือข้อความภาษาอังกฤษที่นี่..." className="min-h-64 resize-y leading-7" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />เวลาประมาณ {formatSpeechDuration(estimatedSeconds)}</span>
            <span className="flex items-center gap-1.5"><Languages className="size-3.5" />ตรวจภาษาอัตโนมัติได้</span>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border bg-background/70 p-4" aria-labelledby="tts-settings-title">
          <div className="flex items-center gap-2"><Volume2 className="size-4 text-primary" /><h3 id="tts-settings-title" className="font-semibold">ตั้งค่าเสียง</h3></div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="tts-language">ภาษา</Label>
              <Select value={language} onValueChange={(value) => changeLanguage(value as SpeechLanguage)} disabled={isActive}>
                <SelectTrigger id="tts-language" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="auto">ตรวจจากข้อความอัตโนมัติ</SelectItem><SelectItem value="th-TH">ภาษาไทย</SelectItem><SelectItem value="en-US">English</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="tts-voice">เสียงจาก Browser / ระบบ</Label>
              <Select value={voiceId} onValueChange={setVoiceId} disabled={isActive || !supported}>
                <SelectTrigger id="tts-voice" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">เสียงอัตโนมัติของระบบ</SelectItem>
                  {availableVoices.map((voice) => <SelectItem key={getSpeechVoiceId(voice)} value={getSpeechVoiceId(voice)}>{voice.name} · {voice.lang}{voice.localService ? " · ในเครื่อง" : " · ออนไลน์"}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">พบ {voices.length.toLocaleString("th-TH")} เสียงบนอุปกรณ์นี้{selectedVoice ? ` · เลือก ${selectedVoice.localService ? "เสียงในเครื่อง" : "เสียงออนไลน์"}` : ""}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2"><Label htmlFor="tts-rate">ความเร็ว</Label><span className="text-xs font-semibold text-primary">{rate.toFixed(1)}×</span></div>
                <input id="tts-rate" type="range" min={0.5} max={2} step={0.1} value={rate} disabled={isActive} onChange={(event) => setRate(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2"><Label htmlFor="tts-pitch">โทนเสียง</Label><span className="text-xs font-semibold text-primary">{pitch.toFixed(1)}</span></div>
                <input id="tts-pitch" type="range" min={0.5} max={1.5} step={0.1} value={pitch} disabled={isActive} onChange={(event) => setPitch(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2"><Label htmlFor="tts-volume">ความดัง</Label><span className="text-xs font-semibold text-primary">{Math.round(volume * 100)}%</span></div>
                <input id="tts-volume" type="range" min={0} max={1} step={0.1} value={volume} disabled={isActive} onChange={(event) => setVolume(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {!supported ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">Browser นี้ไม่รองรับ Web Speech API กรุณาใช้ Chrome, Edge หรือ Safari เวอร์ชันปัจจุบัน</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5 rounded-xl border bg-primary/[0.03] p-4" data-testid="tts-player" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />{getPlaybackLabel(status)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{segmentCount > 0 ? `ช่วงที่ ${(activeSegment + 1).toLocaleString("th-TH")} จาก ${segmentCount.toLocaleString("th-TH")}` : "แบ่งข้อความเป็นช่วงสั้นเพื่อให้ Browser อ่านต่อเนื่อง"}</p>
          </div>
          <span className="text-sm font-semibold text-primary">{progress}%</span>
        </div>
        <div role="progressbar" aria-label="ความคืบหน้าการอ่านข้อความ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
        <div className="mt-4 min-h-20 rounded-lg border bg-background/75 p-3 text-sm leading-6 text-muted-foreground">{currentSegment || "เมื่อเริ่มอ่าน ข้อความช่วงปัจจุบันจะแสดงที่นี่"}</div>

        <div className="mt-4"><ActionBar>
          <Button type="button" onClick={startPlayback} disabled={!text.trim() || isActive || !supported}><Play className="size-4" />{status === "finished" ? "อ่านอีกครั้ง" : "เริ่มอ่าน"}</Button>
          <Button type="button" variant="outline" onClick={togglePause} disabled={!isActive}>{status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}{status === "paused" ? "อ่านต่อ" : "พัก"}</Button>
          <Button type="button" variant="outline" onClick={() => stopPlayback()} disabled={!isActive}><Square className="size-4" />หยุด</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar></div>
      </div>

      <div className="mt-5 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />Meaw Tools ไม่ส่งข้อความไปยัง Server ของเรา แต่เสียงออนไลน์บางรายการอาจประมวลผลผ่านผู้ให้บริการของ Browser หรือระบบปฏิบัติการ จึงไม่ควรใส่ข้อมูลลับ</p>
        <p className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />เครื่องมือนี้ใช้สำหรับฟังและตรวจข้อความ ไม่สร้างหรือดาวน์โหลดไฟล์ MP3 คุณภาพและรายชื่อเสียงขึ้นกับอุปกรณ์ของผู้ใช้</p>
      </div>
    </WorkspaceFrame>
  );
}
