import type {
  DentalSpecialty,
  SpeechProviderKind,
  SpeechSttPromptPolicy,
  SpeechTranscriptionSource
} from "@dental/shared";
import { numberFromEnv } from "./keyPool.js";

const promptVersion = "dental-stt-prompt-v2-2026-05-16";
const promptProviders: SpeechProviderKind[] = ["groq_whisper", "openai_transcribe"];

const baseTerms = [
  "FDI 11-48",
  "RVG",
  "OPG",
  "CBCT",
  "TRG",
  "cofferdam",
  "Air Flow",
  "E.max",
  "zirconia",
  "metal-ceramic",
  "PMMA",
  "veneer",
  "inlay",
  "onlay",
  "overlay",
  "endocrown",
  "abutment",
  "sinus-lift",
  "bone grafting",
  "membrane",
  "surgical guide",
  "iTero",
  "Medit",
  "3Shape"
];

const specialtyTerms: Record<DentalSpecialty, string[]> = {
  therapist: ["caries", "pulpitis", "periodontitis", "canal", "restoration", "composite", "rubber dam"],
  orthopedist: ["crown", "bridge", "veneer", "lithium disilicate", "zirconia", "post core", "temporary crown"],
  surgeon: ["extraction", "suture", "incision", "cystectomy", "alveolitis", "hemostasis", "PRF"],
  orthodontist: ["braces", "aligner", "retainer", "occlusion", "archwire", "Damon", "Invisalign"],
  periodontist: ["periodontal pocket", "curettage", "splinting", "flap surgery", "gingiva"],
  hygienist: ["scaling", "polishing", "fluoride", "remineralization", "biofilm"],
  pediatric: ["primary tooth", "pulpotomy", "sealant", "adaptation", "silver diamine fluoride"],
  implantologist: ["implant", "abutment", "healing cap", "sinus-lift", "bone graft", "guided surgery"],
  radiologist: ["periapical", "bitewing", "OPG", "CBCT", "MPR", "panoramic reconstruction"],
  universal: ["exam", "complaint", "anamnesis", "objective status", "diagnosis candidate", "treatment plan"]
};

function promptEnabled(): boolean {
  const value = (process.env.DENTAL_STT_DENTAL_PROMPT ?? "on").trim().toLowerCase();
  return !["0", "off", "false", "no"].includes(value);
}

function maxPromptChars(): number {
  return Math.max(220, Math.min(numberFromEnv("DENTAL_STT_PROMPT_MAX_CHARS", 840), 1200));
}

function customTerms(): string[] {
  return (process.env.DENTAL_STT_CUSTOM_TERMS ?? "")
    .split(/[,\n;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sourceHint(source: SpeechTranscriptionSource): string {
  if (source === "visit") return "Диктовка приема у кресла.";
  if (source === "import") return "Административная диктовка для импорта.";
  if (source === "document") return "Диктовка для черновика документа.";
  return "Тестовая диктовка в настройках.";
}

function trimPrompt(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars);
  return clipped.slice(0, Math.max(0, clipped.lastIndexOf(","))).trimEnd() + ".";
}

export function buildDentalSttPrompt(input: {
  providerId: SpeechProviderKind;
  specialty?: DentalSpecialty | null;
  source?: SpeechTranscriptionSource | null;
}): string | null {
  if (!promptEnabled() || !promptProviders.includes(input.providerId)) return null;
  const specialty = input.specialty ?? "universal";
  const terms = uniqueTerms([...baseTerms, ...specialtyTerms[specialty], ...customTerms()]).slice(0, 42);
  const prompt = [
    `${sourceHint(input.source ?? "visit")} Стоматологический контекст распознавания речи.`,
    "Расшифруй дословно на языке речи, обычно русском. Не суммируй, не ставь диагноз, не достраивай и не добавляй факты.",
    "Сохраняй номера зубов, неопределенность, бренды, материалы, латинские названия и сокращения.",
    `Термины: ${terms.join(", ")}.`
  ].join(" ");
  return trimPrompt(prompt, maxPromptChars());
}

export function getDentalSttPromptPolicy(): SpeechSttPromptPolicy {
  const terms = uniqueTerms([...baseTerms, ...customTerms()]);
  const promptPreview =
    buildDentalSttPrompt({ providerId: "groq_whisper", specialty: "universal", source: "visit" }) ??
    "Стоматологический словарь распознавания выключен.";
  const warnings: string[] = [];
  if (!promptEnabled()) warnings.push("Стоматологический словарь распознавания выключен в серверных настройках.");
  if (customTerms().length) warnings.push("К стандартному словарю распознавания добавлены термины клиники из серверных настроек.");

  return {
    enabled: promptEnabled(),
    version: promptVersion,
    appliesTo: promptProviders,
    maxChars: maxPromptChars(),
    termCount: terms.length,
    promptPreview,
    warnings
  };
}
