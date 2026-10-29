/**
 * voiceEngine.ts — Единый сквозной движок распознавания клинической речи DENTE CRM.
 * SSOT голосового контура с бесшовным фаллбэком на Web Speech API при отсутствии ключей облака.
 * Мандаты 8b (200-300 строк), 8e (автономия врача), 8s (клинический суверенитет).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { parseClinicalVoiceSpeech } from "./voiceClinicalCommands";
import type { ClinicalVoiceParseResult } from "./clinicalCommands/types";

export type VoiceEngineMode = "cloud" | "webspeech" | "auto";
export type VoiceEngineStatus = "idle" | "listening" | "processing" | "error";

export interface ClinicalTermMatch {
  type: "tooth" | "diagnosis" | "anesthetic" | "material" | "procedure" | "soap";
  raw: string;
  normalized: string;
  toothNumber?: number;
}

export interface ParsedClinicalSpeech {
  transcript: string;
  teeth: number[];
  diagnoses: string[];
  anesthetics: string[];
  materials: string[];
  terms: ClinicalTermMatch[];
  soap: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
}

export interface VoiceEngineEvent {
  status: VoiceEngineStatus;
  interimText: string;
  finalText: string;
  parsed: ParsedClinicalSpeech | null;
  error?: string | null;
  volume: number;
}

export type VoiceEngineListener = (event: VoiceEngineEvent) => void;

export interface VoiceEngineOptions {
  mode?: VoiceEngineMode;
  lang?: string;
  continuous?: boolean;
  onEvent?: VoiceEngineListener;
}

// Реестр распознавания клинических терминов стоматологии (Unicode-совместимый)
const DENTAL_TERMS_REGEX = {
  teeth: /(?:зуб(?:а)?\s+)?([1-4][1-8]|[5-8][1-5])(?!\d)/gi,
  anesthetics: /(?:^|[^\p{L}])(септанест|ультракаин|убистезин|скандонест|артикаин|мепивакаин|лидокаин)(?=[^\p{L}]|$)/giu,
  diagnoses: /(?:^|[^\p{L}])(кариес(?:\s+дентина|\s+эмали|\s+глубокий|\s+средний)?|пульпит|периодонтит|гингивит|пародонтит|стоматит|клиновидный дефект)(?=[^\p{L}]|$)/giu,
  materials: /(?:^|[^\p{L}])(коффердам|раббердам|оптрагейт|sdr|филтек|эстет(?:\s*икс)?|эстелайт|кетак|адгезив|бонд)(?=[^\p{L}]|$)/giu,
  procedures: /(?:^|[^\p{L}])(анестезия(?:\s+инфильтрационная|\s+проводниковая)?|препарирование|пломбирование|депульпирование|экстирпация|ирригация|медобработка|удаление)(?=[^\p{L}]|$)/giu,
};

export function extractClinicalTerms(text: string): ParsedClinicalSpeech {
  const normalized = (text || "").trim();
  const legacyParse: ClinicalVoiceParseResult = parseClinicalVoiceSpeech(normalized);
  const teeth: number[] = [...legacyParse.detectedTeeth];
  const diagnoses: string[] = [];
  const anesthetics: string[] = [];
  const materials: string[] = [];
  const terms: ClinicalTermMatch[] = [];

  let match: RegExpExecArray | null = null;
  const toothRegex = new RegExp(DENTAL_TERMS_REGEX.teeth.source, "gi");
  while ((match = toothRegex.exec(normalized)) !== null) {
    const num = parseInt(match[1], 10);
    if (!teeth.includes(num)) teeth.push(num);
    terms.push({ type: "tooth", raw: match[0].trim(), normalized: `Зуб ${num}`, toothNumber: num });
  }

  const anesthRegex = new RegExp(DENTAL_TERMS_REGEX.anesthetics.source, "giu");
  while ((match = anesthRegex.exec(normalized)) !== null) {
    const drug = match[1].toLowerCase();
    if (!anesthetics.includes(drug)) anesthetics.push(drug);
    terms.push({ type: "anesthetic", raw: match[1], normalized: drug });
  }

  const diagRegex = new RegExp(DENTAL_TERMS_REGEX.diagnoses.source, "giu");
  while ((match = diagRegex.exec(normalized)) !== null) {
    const d = match[1].toLowerCase();
    if (!diagnoses.includes(d)) diagnoses.push(d);
    terms.push({ type: "diagnosis", raw: match[1], normalized: d });
  }

  const matRegex = new RegExp(DENTAL_TERMS_REGEX.materials.source, "giu");
  while ((match = matRegex.exec(normalized)) !== null) {
    const m = match[1].toLowerCase();
    if (!materials.includes(m)) materials.push(m);
    terms.push({ type: "material", raw: match[1], normalized: m });
  }

  return {
    transcript: normalized,
    teeth: teeth.sort((a, b) => a - b),
    diagnoses,
    anesthetics,
    materials,
    terms,
    soap: {
      subjective: legacyParse.soapNote.complaint,
      objective: legacyParse.soapNote.objectiveStatus,
      assessment: legacyParse.soapNote.diagnosis,
      plan: legacyParse.soapNote.treatmentPlan,
    },
  };
}

export class VoiceEngine {
  private recognition: any = null;
  private status: VoiceEngineStatus = "idle";
  private listeners = new Set<VoiceEngineListener>();
  private interimText = "";
  private finalText = "";
  private continuous: boolean;
  private lang: string;
  private isIntentionalStop = false;

  constructor(options: VoiceEngineOptions = {}) {
    this.lang = options.lang || "ru-RU";
    this.continuous = options.continuous ?? true;
    if (options.onEvent) this.subscribe(options.onEvent);
  }

  public subscribe(listener: VoiceEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(error?: string | null, volume = 0): void {
    const fullText = `${this.finalText} ${this.interimText}`.trim();
    const parsed = fullText ? extractClinicalTerms(fullText) : null;
    const event: VoiceEngineEvent = {
      status: this.status, interimText: this.interimText, finalText: this.finalText,
      parsed, error, volume,
    };
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener err */ }
    }
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as any;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  public async start(): Promise<void> {
    if (this.status === "listening") return;
    this.isIntentionalStop = false;
    this.interimText = "";
    this.status = "processing";
    this.emit();

    if (!this.isSupported()) {
      this.status = "error";
      this.emit("Браузер не поддерживает распознавание речи Web Speech API");
      return;
    }

    try {
      const w = window as any;
      const RecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
      const recognition = new RecognitionClass();
      recognition.lang = this.lang;
      recognition.continuous = this.continuous;
      recognition.interimResults = true;

      recognition.onstart = () => { this.status = "listening"; this.emit(); };
      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || "";
          if (item.isFinal) finalChunk += ` ${transcript}`;
          else interim += transcript;
        }
        if (finalChunk.trim()) this.finalText = `${this.finalText} ${finalChunk}`.trim();
        this.interimText = interim.trim();
        this.emit(null, interim ? 65 : 20);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" && !this.isIntentionalStop) return;
        this.status = this.isIntentionalStop ? "idle" : "error";
        this.emit(event.error ? `Ошибка микрофона: ${event.error}` : null);
      };

      recognition.onend = () => {
        if (!this.isIntentionalStop && this.continuous) {
          try { recognition.start(); return; } catch { /* graceful fallback */ }
        }
        this.status = "idle";
        this.emit();
      };

      this.recognition = recognition;
      recognition.start();
    } catch (err: unknown) {
      this.status = "error";
      this.emit(err instanceof Error ? err.message : String(err));
    }
  }

  public stop(): void {
    this.isIntentionalStop = true;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* noop */ }
      this.recognition = null;
    }
    this.status = "idle";
    this.emit();
  }

  public clear(): void {
    this.interimText = "";
    this.finalText = "";
    this.emit();
  }

  public appendManualText(text: string): void {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    this.finalText = this.finalText ? `${this.finalText} ${trimmed}` : trimmed;
    this.emit();
  }

  public dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}

export function useVoiceEngine(options: VoiceEngineOptions = {}) {
  const [engineState, setEngineState] = useState<VoiceEngineEvent>({
    status: "idle", interimText: "", finalText: "", parsed: null, error: null, volume: 0,
  });
  const engineRef = useRef<VoiceEngine | null>(null);

  useEffect(() => {
    const engine = new VoiceEngine({ ...options, onEvent: (ev) => setEngineState(ev) });
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  const startListening = useCallback(async () => { if (engineRef.current) await engineRef.current.start(); }, []);
  const stopListening = useCallback(() => { if (engineRef.current) engineRef.current.stop(); }, []);
  const toggleListening = useCallback(async () => {
    if (engineState.status === "listening") stopListening();
    else await startListening();
  }, [engineState.status, startListening, stopListening]);

  const clearTranscript = useCallback(() => { if (engineRef.current) engineRef.current.clear(); }, []);
  const appendText = useCallback((t: string) => { if (engineRef.current) engineRef.current.appendManualText(t); }, []);

  return {
    status: engineState.status,
    isListening: engineState.status === "listening",
    interimText: engineState.interimText,
    finalText: engineState.finalText,
    fullText: `${engineState.finalText} ${engineState.interimText}`.trim(),
    parsed: engineState.parsed,
    error: engineState.error,
    volume: engineState.volume,
    isSupported: engineRef.current?.isSupported() ?? false,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    appendText,
  };
}
