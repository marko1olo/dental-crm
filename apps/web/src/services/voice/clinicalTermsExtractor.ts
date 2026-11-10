/**
 * clinicalTermsExtractor.ts — Канонический сервис извлечения клинических терминов из распознанной речи.
 * Мандаты 8b, 8e (автономия врача), 8s (клинический суверенитет), 8be (честная типизация).
 */
import type { ClinicalVoiceParseResult } from "../../components/voice/clinicalCommands/types";
import { parseClinicalVoiceSpeech } from "../../components/voice/voiceClinicalCommands";

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
  const diagnoses: string[] = [];
  const anesthetics: string[] = [];
  const materials: string[] = [];
  const terms: ClinicalTermMatch[] = [];

  let match: RegExpExecArray | null = null;
  const toothRe = new RegExp(DENTAL_TERMS_REGEX.teeth.source, "gi");
  while ((match = toothRe.exec(norm)) !== null) {
    const rawMatch = match[1];
    if (rawMatch) {
      const num = parseInt(rawMatch, 10);
      if (!Number.isNaN(num) && !teeth.includes(num)) {
        teeth.push(num);
      }
      terms.push({ type: "tooth", raw: match[0].trim(), normalized: `Зуб ${num}`, toothNumber: num });
    }
  }

  const matchers: Array<{ re: RegExp; type: ClinicalTermMatch["type"]; list: string[] }> = [
    { re: new RegExp(DENTAL_TERMS_REGEX.anesthetics.source, "giu"), type: "anesthetic", list: anesthetics },
    { re: new RegExp(DENTAL_TERMS_REGEX.diagnoses.source, "giu"), type: "diagnosis", list: diagnoses },
    { re: new RegExp(DENTAL_TERMS_REGEX.materials.source, "giu"), type: "material", list: materials },
  ];

  for (const { re, type, list } of matchers) {
    while ((match = re.exec(norm)) !== null) {
      const captured = match[1];
      if (captured) {
        const val = captured.toLowerCase();
        if (!list.includes(val)) {
          list.push(val);
        }
        terms.push({ type, raw: captured, normalized: val });
      }
    }
  }

  return {
    transcript: norm,
    teeth: teeth.sort((a, b) => a - b),
    diagnoses,
    anesthetics,
    materials,
    terms,
    soap: {
      ...(legacy.soapNote.subjective ? { subjective: legacy.soapNote.subjective } : {}),
      ...(legacy.soapNote.objective ? { objective: legacy.soapNote.objective } : {}),
      ...(legacy.soapNote.assessment ? { assessment: legacy.soapNote.assessment } : {}),
      ...(legacy.soapNote.plan ? { plan: legacy.soapNote.plan } : {}),
    },
  };
}
