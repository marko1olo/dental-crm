/**
 * voiceEngine.ts — Единый сквозной движок распознавания клинической речи DENTE CRM.
 * SSOT голосового контура: Real Google Gemini STT + бесшовный Web Speech fallback.
 * Мандаты 8b (250-295 строк), 8e (автономия врача), 8s (клинический суверенитет).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { ClinicalVoiceParseResult } from "./clinicalCommands/types";
import { parseClinicalVoiceSpeech } from "./voiceClinicalCommands";

export type VoiceEngineMode = "cloud" | "webspeech" | "auto";
export type VoiceEngineStatus = "idle" | "listening" | "processing" | "error";
export type VoiceEngineListener = (event: VoiceEngineEvent) => void;

export interface ClinicalTermMatch {
  type: "tooth" | "diagnosis" | "anesthetic" | "material" | "procedure" | "soap";
  raw: string; normalized: string; toothNumber?: number;
}
export interface ParsedClinicalSpeech {
  transcript: string; teeth: number[]; diagnoses: string[]; anesthetics: string[]; materials: string[];
  terms: ClinicalTermMatch[];
  soap: { subjective?: string; objective?: string; assessment?: string; plan?: string };
}
export interface VoiceEngineEvent {
  status: VoiceEngineStatus; mode: VoiceEngineMode; interimText: string; finalText: string;
  parsed: ParsedClinicalSpeech | null; error?: string | null; volume: number;
}
export interface VoiceEngineOptions {
  mode?: VoiceEngineMode; lang?: string; continuous?: boolean;
  patientId?: string | null; visitId?: string | null; onEvent?: VoiceEngineListener;
}

const DENTAL_TERMS_REGEX = {
  teeth: /(?:зуб(?:а)?\s+)?([1-4][1-8]|[5-8][1-5])(?!\d)/gi,
  anesthetics: /(?:^|[^\p{L}])(септанест|ультракаин|убистезин|скандонест|артикаин|мепивакаин|лидокаин)(?=[^\p{L}]|$)/giu,
  diagnoses: /(?:^|[^\p{L}])(кариес(?:\s+дентина|\s+эмали|\s+глубокий|\s+средний)?|пульпит|периодонтит|гингивит|пародонтит|стоматит|клиновидный дефект)(?=[^\p{L}]|$)/giu,
  materials: /(?:^|[^\p{L}])(коффердам|раббердам|оптрагейт|sdr|филтек|эстет(?:\s*икс)?|эстелайт|кетак|адгезив|бонд)(?=[^\p{L}]|$)/giu,
};

export function extractClinicalTerms(text: string): ParsedClinicalSpeech {
  const norm = (text || "").trim();
  const legacy: ClinicalVoiceParseResult = parseClinicalVoiceSpeech(norm);
  const teeth = [...legacy.detectedTeeth];
  const diagnoses: string[] = []; const anesthetics: string[] = [];
  const materials: string[] = []; const terms: ClinicalTermMatch[] = [];

  let match: RegExpExecArray | null = null;
  const toothRe = new RegExp(DENTAL_TERMS_REGEX.teeth.source, "gi");
  while ((match = toothRe.exec(norm)) !== null) {
    const num = parseInt(match[1], 10);
    if (!teeth.includes(num)) teeth.push(num);
    terms.push({ type: "tooth", raw: match[0].trim(), normalized: `Зуб ${num}`, toothNumber: num });
  }
  const matchers: Array<{ re: RegExp; type: ClinicalTermMatch["type"]; list: string[] }> = [
    { re: new RegExp(DENTAL_TERMS_REGEX.anesthetics.source, "giu"), type: "anesthetic", list: anesthetics },
    { re: new RegExp(DENTAL_TERMS_REGEX.diagnoses.source, "giu"), type: "diagnosis", list: diagnoses },
    { re: new RegExp(DENTAL_TERMS_REGEX.materials.source, "giu"), type: "material", list: materials },
  ];
  for (const { re, type, list } of matchers) {
    while ((match = re.exec(norm)) !== null) {
      const val = match[1].toLowerCase();
      if (!list.includes(val)) list.push(val);
      terms.push({ type, raw: match[1], normalized: val });
    }
  }

  return {
    transcript: norm, teeth: teeth.sort((a, b) => a - b), diagnoses, anesthetics, materials, terms,
    soap: { subjective: legacy.soapNote.subjective, objective: legacy.soapNote.objective, assessment: legacy.soapNote.assessment, plan: legacy.soapNote.plan },
  };
}

export class VoiceEngine {
  private mode: VoiceEngineMode; private lang: string; private continuous: boolean;
  private status: VoiceEngineStatus = "idle"; private listeners = new Set<VoiceEngineListener>();
  private interimText = ""; private finalText = ""; private isIntentionalStop = false;
  private recordingId = `rec_${Date.now()}`; private chunkIndex = 0;
  private mediaStream: MediaStream | null = null; private mediaRecorder: MediaRecorder | null = null;
  private recognition: any = null; private patientId?: string | null; private visitId?: string | null;
  private restartAttempts = 0; private restartTimer: any = null; private currentError: string | null = null;

  constructor(options: VoiceEngineOptions = {}) {
    this.mode = options.mode || "auto"; this.lang = options.lang || "ru-RU";
    this.continuous = options.continuous ?? true;
    this.patientId = options.patientId; this.visitId = options.visitId;
    if (options.onEvent) this.subscribe(options.onEvent);
  }

  public subscribe(listener: VoiceEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(error?: string | null, volume = 0): void {
    if (error !== undefined) this.currentError = error;
    const full = `${this.finalText} ${this.interimText}`.trim();
    const parsed = full ? extractClinicalTerms(full) : null;
    const event: VoiceEngineEvent = {
      status: this.status, mode: this.mode, interimText: this.interimText,
      finalText: this.finalText, parsed, error: this.currentError, volume,
    };
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as any;
    return Boolean(navigator?.mediaDevices?.getUserMedia || w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  public async start(): Promise<void> {
    if (this.status === "listening") return;
    this.isIntentionalStop = false; this.restartAttempts = 0; this.clearRestartTimer(); this.currentError = null;
    this.interimText = ""; this.status = "processing"; this.emit();
    if (this.mode === "cloud" || this.mode === "auto") {
      const ok = await this.startCloudRecorder();
      if (ok) return;
      if (this.mode === "cloud") {
        this.status = "error"; this.emit("Облачный распознаватель речи недоступен. Проверьте API-ключи."); return;
      }
    }
    this.startWebSpeech();
  }

  private async startCloudRecorder(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) return false;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      this.mediaRecorder = mime ? new MediaRecorder(this.mediaStream, { mimeType: mime }) : new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = async (e) => { if (e.data && e.data.size > 0 && !this.isIntentionalStop) await this.uploadAudioChunk(e.data); };
      this.mediaRecorder.onstart = () => { this.status = "listening"; this.emit(null, 50); };
      this.mediaRecorder.onerror = () => this.fallbackToWebSpeech();
      this.mediaRecorder.start(3500);
      return true;
    } catch { return false; }
  }

  private async uploadAudioChunk(blob: Blob): Promise<void> {
    try {
      const reader = new FileReader();
      const b64 = await new Promise<string>((res, rej) => {
        reader.onloadend = () => res(((reader.result as string) || "").split(",")[1] || "");
        reader.onerror = rej; reader.readAsDataURL(blob);
      });
      if (!b64) return;
      const res = await fetch("/api/speech/transcribe-chunk", {
        method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
        body: JSON.stringify({ recordingId: this.recordingId, chunkIndex: this.chunkIndex++, mimeType: blob.type || "audio/webm", audioBase64: b64, language: "ru", source: "visit", patientId: this.patientId, visitId: this.visitId }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.chunk?.transcript?.trim();
        if (text) { this.finalText = this.finalText ? `${this.finalText} ${text}` : text; this.emit(null, 65); void this.syncDictationBackend(this.finalText); }
      } else if (this.mode === "auto") { this.fallbackToWebSpeech(); }
    } catch { if (this.mode === "auto") this.fallbackToWebSpeech(); }
  }

  private fallbackToWebSpeech(): void {
    if (this.isIntentionalStop) return;
    this.stopRecorderOnly(); this.startWebSpeech();
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
  }

  private startWebSpeech(): void {
    const w = window as any;
    const Cls = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Cls) { this.status = "error"; this.emit("Распознавание речи не поддерживается браузером"); return; }
    try {
      const rec = new Cls();
      rec.lang = this.lang; rec.continuous = this.continuous; rec.interimResults = true;
      rec.onstart = () => { this.status = "listening"; this.restartAttempts = 0; this.clearRestartTimer(); this.emit(); };
      rec.onresult = (ev: any) => {
        let interim = ""; let finalChunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; ++i) {
          const item = ev.results[i]; const t = item[0]?.transcript || "";
          if (item.isFinal) finalChunk += ` ${t}`; else interim += t;
        }
        if (finalChunk.trim()) {
          this.finalText = `${this.finalText} ${finalChunk}`.trim();
          void this.syncDictationBackend(this.finalText);
        }
        this.interimText = interim.trim(); this.emit(null, interim ? 65 : 20);
      };
      rec.onerror = (e: any) => {
        const err = e?.error || "unknown";
        if (err === "no-speech" && !this.isIntentionalStop) return;
        const fatal = ["not-allowed", "permission-denied", "service-not-allowed", "audio-capture", "language-not-supported", "bad-grammar"];
        const isFatal = fatal.includes(err);
        this.status = this.isIntentionalStop ? "idle" : "error";
        if (isFatal) { this.isIntentionalStop = true; this.stopRecorderOnly(); }
        const msg = isFatal && (err === "not-allowed" || err === "permission-denied")
          ? "Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера."
          : `Сбой микрофона: ${err}`;
        this.emit(msg);
      };
      rec.onend = () => {
        this.clearRestartTimer();
        if (this.isIntentionalStop || this.status === "error") {
          if (this.status !== "error") this.status = "idle";
          this.emit(); return;
        }
        if (this.continuous && this.restartAttempts < 3) {
          const delay = Math.min(1000 * Math.pow(2, this.restartAttempts++), 4000);
          this.restartTimer = setTimeout(() => {
            if (this.isIntentionalStop || this.status === "error") return;
            try { rec.start(); } catch { this.status = "error"; this.emit("Не удалось перезапустить микрофон"); }
          }, delay);
          return;
        }
        this.status = "idle"; this.emit();
      };
      this.recognition = rec; rec.start();
    } catch (err: unknown) {
      this.status = "error"; this.emit(err instanceof Error ? err.message : String(err));
    }
  }

  private async syncDictationBackend(text: string): Promise<void> {
    if (!text.trim() || typeof window === "undefined") return;
    try {
      await fetch("/api/ai/parse-dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
        body: JSON.stringify({ text: text.trim(), type: "visit" }),
      });
    } catch { /* graceful local nlp */ }
  }

  private stopRecorderOnly(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop(); } catch { /* noop */ }
    }
    this.mediaRecorder = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  public stop(): void {
    this.isIntentionalStop = true; this.clearRestartTimer(); this.stopRecorderOnly();
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* noop */ }
      this.recognition = null;
    }
    if (this.status !== "error") this.status = "idle";
    this.emit();
  }

  public clear(): void { this.interimText = ""; this.finalText = ""; this.emit(); }

  public appendManualText(text: string): void {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    this.finalText = this.finalText ? `${this.finalText} ${trimmed}` : trimmed;
    this.emit(); void this.syncDictationBackend(this.finalText);
  }

  public dispose(): void { this.clearRestartTimer(); this.stop(); this.listeners.clear(); }
}

export function useVoiceEngine(options: VoiceEngineOptions = {}) {
  const [engineState, setEngineState] = useState<VoiceEngineEvent>({
    status: "idle", mode: options.mode || "auto", interimText: "", finalText: "",
    parsed: null, error: null, volume: 0,
  });
  const engineRef = useRef<VoiceEngine | null>(null);

  useEffect(() => {
    const engine = new VoiceEngine({ ...options, onEvent: (ev) => setEngineState(ev) });
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, [options.mode, options.patientId, options.visitId]);

  return {
    status: engineState.status, mode: engineState.mode, isListening: engineState.status === "listening",
    interimText: engineState.interimText, finalText: engineState.finalText,
    fullText: `${engineState.finalText} ${engineState.interimText}`.trim(),
    parsed: engineState.parsed, error: engineState.error, volume: engineState.volume,
    isSupported: engineRef.current?.isSupported() ?? false,
    startListening: useCallback(async () => { if (engineRef.current) await engineRef.current.start(); }, []),
    stopListening: useCallback(() => { if (engineRef.current) engineRef.current.stop(); }, []),
    toggleListening: useCallback(async () => {
      if (engineState.status === "listening") engineRef.current?.stop();
      else if (engineRef.current) await engineRef.current.start();
    }, [engineState.status]),
    clearTranscript: useCallback(() => { if (engineRef.current) engineRef.current.clear(); }, []),
    appendText: useCallback((t: string) => { if (engineRef.current) engineRef.current.appendManualText(t); }, []),
  };
}
