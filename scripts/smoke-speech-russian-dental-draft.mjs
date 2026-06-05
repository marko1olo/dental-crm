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
  "Пациент жалуется на боль при накусывании зуб три шесть и реакцию на холодное.",
  "Со слов после старой пломбы.",
  "Объективно кариозная поласть на окклюзионной поверхности, зандирование болезненное, перкусия слабо положительная.",
  "На снимке рвг периапикально без изменений.",
  "Предварительный диагноз кариес дентин 36.",
  "Проведено препарирование под кофедамом, адгизивный протокол, композитная рестоврация.",
  "Рекомендовано контроль."
].join(" ");

const normalized = normalizeDentalSpeechTranscript(transcript, "therapist");

includesText(normalized.normalizedText, "зуб 36", "normalized transcript");
includesText(normalized.normalizedText, "кариозная полость", "normalized transcript");
includesText(normalized.normalizedText, "зондирование", "normalized transcript");
includesText(normalized.normalizedText, "перкуссия", "normalized transcript");
includesText(normalized.normalizedText, "RVG", "normalized transcript");
includesText(normalized.normalizedText, "коффердам", "normalized transcript");
includesText(normalized.normalizedText, "адгезивный", "normalized transcript");
includesText(normalized.normalizedText, "реставрация", "normalized transcript");
includesText(normalized.normalizedText, "кариес дентина", "normalized transcript");
assert(normalized.changedPhrases.length >= 6, "normalization must track changed dental phrases");

const draft = buildRuleBasedVisitDraftFromTranscript(transcript, "therapist");

includesText(draft.complaint, "накусывании", "complaint field");
includesText(draft.complaint, "зуб 36", "complaint field");
includesText(draft.anamnesis, "после старой пломбы", "anamnesis field");
includesText(draft.objectiveStatus, "кариозная полость", "objective field");
includesText(draft.objectiveStatus, "зондирование", "objective field");
includesText(draft.objectiveStatus, "RVG", "objective field");
includesText(draft.diagnosis, "кариес дентина", "diagnosis field");
includesText(draft.treatmentPlan, "препарирование", "treatment plan field");
includesText(draft.treatmentPlan, "коффердам", "treatment plan field");
includesText(draft.treatmentPlan, "контроль", "treatment plan field");

assert(draft.quality?.detectedToothCodes.includes("36"), "quality must detect FDI 36");
assert(draft.quality?.signals.includes("imaging_mentioned"), "quality must detect imaging mention");
assert(draft.quality?.signals.includes("procedure_mentioned"), "quality must detect procedure mention");
assert(draft.quality?.signals.includes("plan_detected"), "quality must detect plan");

console.log(
  JSON.stringify({
    ok: true,
    checked: "russian dental speech normalization and visit draft mapping",
    toothCodes: draft.quality?.detectedToothCodes ?? []
  })
);
