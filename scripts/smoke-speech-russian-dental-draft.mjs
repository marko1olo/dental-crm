import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(sharedPath)) {
  throw new Error("Build shared first: npm run build -w @dental/shared");
}

const { buildRuleBasedVisitDraftFromTranscript, normalizeDentalSpeechTranscript } = await import(
  pathToFileURL(sharedPath).href
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includesText(value, expected, label) {
  assert(
    typeof value === "string" && value.toLowerCase().includes(expected.toLowerCase()),
    `${label} must include "${expected}", got: ${value}`
  );
}

const transcript = [
  "Пациент отмечает боль при накусывании зуб 3.6 и реакцию на холодное.",
  "Со слов после старой пломбы, ранее лечен тридцать шестого зуба.",
  "Объективно кариозная поласть на оклюзионной поверхности, при шеечной области пигментация.",
  "Зандирование болезненное, перкусия слабо положительная, э о д снижено.",
  "На снимке рвг периапикально без изменений, к л к т без признаков резорбции.",
  "Предварительно кариес дентин 36.",
  "Проведено препарирование под раббердамом, адгизивный протокол, композитная рестоврация.",
  "Показано контроль, временная пломба при необходимости."
].join(" ");

const normalized = normalizeDentalSpeechTranscript(transcript, "therapist");

includesText(normalized.normalizedText, "зуб 36", "normalized transcript");
includesText(normalized.normalizedText, "лечен 36 зуба", "normalized transcript");
includesText(normalized.normalizedText, "кариозная полость", "normalized transcript");
includesText(normalized.normalizedText, "окклюзионной поверхности", "normalized transcript");
includesText(normalized.normalizedText, "пришеечной области", "normalized transcript");
includesText(normalized.normalizedText, "зондирование", "normalized transcript");
includesText(normalized.normalizedText, "перкуссия", "normalized transcript");
includesText(normalized.normalizedText, "ЭОД", "normalized transcript");
includesText(normalized.normalizedText, "RVG", "normalized transcript");
includesText(normalized.normalizedText, "КЛКТ", "normalized transcript");
includesText(normalized.normalizedText, "коффердам", "normalized transcript");
includesText(normalized.normalizedText, "адгезивный", "normalized transcript");
includesText(normalized.normalizedText, "реставрация", "normalized transcript");
includesText(normalized.normalizedText, "кариес дентина", "normalized transcript");
includesText(normalized.normalizedText, "временная пломба", "normalized transcript");
assert(normalized.changedPhrases.length >= 6, "normalization must track changed dental phrases");

const draft = buildRuleBasedVisitDraftFromTranscript(transcript, "therapist");

includesText(draft.complaint, "накусывании", "complaint field");
includesText(draft.complaint, "зуб 36", "complaint field");
includesText(draft.anamnesis, "после старой пломбы", "anamnesis field");
includesText(draft.anamnesis, "36 зуба", "anamnesis field");
includesText(draft.objectiveStatus, "кариозная полость", "objective field");
includesText(draft.objectiveStatus, "окклюзионной поверхности", "objective field");
includesText(draft.objectiveStatus, "зондирование", "objective field");
includesText(draft.objectiveStatus, "ЭОД", "objective field");
includesText(draft.objectiveStatus, "RVG", "objective field");
includesText(draft.objectiveStatus, "КЛКТ", "objective field");
includesText(draft.diagnosis, "кариес дентина", "diagnosis field");
includesText(draft.treatmentPlan, "препарирование", "treatment plan field");
includesText(draft.treatmentPlan, "коффердам", "treatment plan field");
includesText(draft.treatmentPlan, "временная пломба", "treatment plan field");
includesText(draft.treatmentPlan, "контроль", "treatment plan field");

assert(draft.quality?.detectedToothCodes.includes("36"), "quality must detect FDI 36");
assert(draft.quality?.signals.includes("imaging_mentioned"), "quality must detect imaging mention");
assert(draft.quality?.signals.includes("procedure_mentioned"), "quality must detect procedure mention");
assert(draft.quality?.signals.includes("plan_detected"), "quality must detect plan");

const scopedTranscript = [
  "Жалобы: нет.",
  "Объективно зуб 24, реакция на холод положительная.",
  "Цвет по шкале A2, ИРОПЗ 0.5, фесура пигментирована.",
  "Диагноз кариес эмали 24.",
  "Проведено гермитизация фиссур, с и ц как подкладка."
].join(" ");
const scopedDraft = buildRuleBasedVisitDraftFromTranscript(scopedTranscript, "therapist");
const scopedNormalized = normalizeDentalSpeechTranscript(scopedTranscript, "therapist");

includesText(scopedNormalized.normalizedText, "ИРОПЗ", "scoped normalized transcript");
includesText(scopedNormalized.normalizedText, "фиссура", "scoped normalized transcript");
includesText(scopedNormalized.normalizedText, "герметизация", "scoped normalized transcript");
includesText(scopedNormalized.normalizedText, "СИЦ", "scoped normalized transcript");
includesText(scopedDraft.complaint, "нет", "scoped complaint field");
assert(!scopedDraft.complaint.toLowerCase().includes("холод"), "objective cold reaction must not be copied into complaint");
includesText(scopedDraft.objectiveStatus, "реакция на холод", "scoped objective field");
includesText(scopedDraft.objectiveStatus, "цвет по шкале A2", "scoped objective field");
includesText(scopedDraft.objectiveStatus, "ИРОПЗ", "scoped objective field");
includesText(scopedDraft.diagnosis, "кариес эмали", "scoped diagnosis field");
includesText(scopedDraft.treatmentPlan, "герметизация", "scoped treatment plan field");
includesText(scopedDraft.treatmentPlan, "СИЦ", "scoped treatment plan field");

console.log(
  JSON.stringify({
    ok: true,
    checked: "russian dental speech normalization and visit draft mapping",
    toothCodes: draft.quality?.detectedToothCodes ?? []
  })
);
