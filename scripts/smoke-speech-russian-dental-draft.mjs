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

const shorthandTranscript = [
  "Без жалоб.",
  "Статус локалис зуб 15, пламба несостоятельна, холодовая проба отрицательная.",
  "Ди эс кариес дентина 15.",
  "Сделано матрица, клин, финишная обработка и полеровка."
].join(" ");
const shorthandDraft = buildRuleBasedVisitDraftFromTranscript(shorthandTranscript, "therapist");
const shorthandNormalized = normalizeDentalSpeechTranscript(shorthandTranscript, "therapist");

includesText(shorthandNormalized.normalizedText, "status localis", "shorthand normalized transcript");
includesText(shorthandNormalized.normalizedText, "пломба", "shorthand normalized transcript");
includesText(shorthandNormalized.normalizedText, "холодовая проба", "shorthand normalized transcript");
includesText(shorthandNormalized.normalizedText, "DS", "shorthand normalized transcript");
includesText(shorthandNormalized.normalizedText, "финирование", "shorthand normalized transcript");
includesText(shorthandNormalized.normalizedText, "полировка", "shorthand normalized transcript");
includesText(shorthandDraft.complaint, "нет", "shorthand complaint field");
includesText(shorthandDraft.objectiveStatus, "пломба", "shorthand objective field");
includesText(shorthandDraft.objectiveStatus, "холодовая проба", "shorthand objective field");
includesText(shorthandDraft.diagnosis, "кариес дентина", "shorthand diagnosis field");
includesText(shorthandDraft.treatmentPlan, "матрица", "shorthand treatment plan field");
includesText(shorthandDraft.treatmentPlan, "клин", "shorthand treatment plan field");
includesText(shorthandDraft.treatmentPlan, "финирование", "shorthand treatment plan field");
includesText(shorthandDraft.treatmentPlan, "полировка", "shorthand treatment plan field");
assert(shorthandDraft.quality?.signals.includes("procedure_mentioned"), "quality must detect matrix and finishing as procedure");

const restorationTranscript = [
  "Жалобы застревание пищи между зубами 16 и 17.",
  "Объективно апрокс имальная поверхность зуб 16, контактный пунт нарушен, прикус проверен артикуляционной бумагой.",
  "DS кариес дентина 16.",
  "Проведено инфилтрационная анастезия одна карпула ультракаина, восстановлен контактный пункт, коррекция оклюзии, шлифовка и полеровка."
].join(" ");
const restorationDraft = buildRuleBasedVisitDraftFromTranscript(restorationTranscript, "therapist");
const restorationNormalized = normalizeDentalSpeechTranscript(restorationTranscript, "therapist");

includesText(restorationNormalized.normalizedText, "апроксимальная", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "контактный пункт", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "инфильтрационная", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "анестезия", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "карпула", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "коррекция окклюзии", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "шлифовка", "restoration normalized transcript");
includesText(restorationNormalized.normalizedText, "полировка", "restoration normalized transcript");
includesText(restorationDraft.complaint, "застревание пищи", "restoration complaint field");
includesText(restorationDraft.objectiveStatus, "апроксимальная", "restoration objective field");
includesText(restorationDraft.objectiveStatus, "контактный пункт", "restoration objective field");
includesText(restorationDraft.diagnosis, "кариес дентина", "restoration diagnosis field");
includesText(restorationDraft.treatmentPlan, "инфильтрационная", "restoration treatment plan field");
includesText(restorationDraft.treatmentPlan, "коррекция окклюзии", "restoration treatment plan field");
includesText(restorationDraft.treatmentPlan, "шлифовка", "restoration treatment plan field");
includesText(restorationDraft.treatmentPlan, "полировка", "restoration treatment plan field");
assert(restorationDraft.quality?.signals.includes("procedure_mentioned"), "quality must detect restoration procedure");

const anatomicToothTranscript = [
  "Жалобы боль при накусывании на нижней левой шестерке.",
  "Объективно верхняя правая шестерка старая пломба без краевого прилегания, нижняя левая шестерка перкуссия болезненная.",
  "DS периодонтит нижней левой шестерки.",
  "План эндодонтическое лечение нижней левой шестерки, контроль прицельный снимок."
].join(" ");
const anatomicToothDraft = buildRuleBasedVisitDraftFromTranscript(anatomicToothTranscript, "therapist");
const anatomicToothNormalized = normalizeDentalSpeechTranscript(anatomicToothTranscript, "therapist");

includesText(anatomicToothNormalized.normalizedText, "зуб 36", "anatomic tooth normalized transcript");
includesText(anatomicToothNormalized.normalizedText, "зуб 16", "anatomic tooth normalized transcript");
includesText(anatomicToothDraft.complaint, "зуб 36", "anatomic tooth complaint field");
includesText(anatomicToothDraft.objectiveStatus, "зуб 16", "anatomic tooth objective field");
includesText(anatomicToothDraft.objectiveStatus, "зуб 36", "anatomic tooth objective field");
includesText(anatomicToothDraft.diagnosis, "периодонтит зуб 36", "anatomic tooth diagnosis field");
includesText(anatomicToothDraft.treatmentPlan, "зуб 36", "anatomic tooth treatment plan field");
assert(anatomicToothDraft.quality?.detectedToothCodes.includes("36"), "quality must detect anatomical FDI 36");
assert(anatomicToothDraft.quality?.detectedToothCodes.includes("16"), "quality must detect anatomical FDI 16");

const anamnesisSurfaceTranscript = [
  "Жалобы нет.",
  "Аллергию отрицает. Соматически здоров. Препараты не принимает.",
  "Объективно зуб два шесть, м о д полость, второго класса по блеку, зондирование болезненное.",
  "Диагноз кариес дентина зуб 26.",
  "Проведено изоляция коффердам, матрица, клин, восстановлена мезиально окклюзиально дистальная поверхность."
].join(" ");
const anamnesisSurfaceDraft = buildRuleBasedVisitDraftFromTranscript(anamnesisSurfaceTranscript, "therapist");
const anamnesisSurfaceNormalized = normalizeDentalSpeechTranscript(anamnesisSurfaceTranscript, "therapist");

includesText(anamnesisSurfaceNormalized.normalizedText, "зуб 26", "anamnesis surface normalized transcript");
includesText(anamnesisSurfaceNormalized.normalizedText, "МОД", "anamnesis surface normalized transcript");
includesText(anamnesisSurfaceNormalized.normalizedText, "II класс по Блэку", "anamnesis surface normalized transcript");
includesText(anamnesisSurfaceDraft.complaint, "нет", "anamnesis surface complaint field");
assert(!anamnesisSurfaceDraft.complaint.toLowerCase().includes("аллерг"), "anamnesis must not be copied into complaint");
includesText(anamnesisSurfaceDraft.anamnesis, "отрицает", "anamnesis surface anamnesis field");
includesText(anamnesisSurfaceDraft.anamnesis, "не принимает", "anamnesis surface anamnesis field");
includesText(anamnesisSurfaceDraft.objectiveStatus, "МОД", "anamnesis surface objective field");
includesText(anamnesisSurfaceDraft.objectiveStatus, "II класс по Блэку", "anamnesis surface objective field");
includesText(anamnesisSurfaceDraft.diagnosis, "кариес дентина", "anamnesis surface diagnosis field");
includesText(anamnesisSurfaceDraft.treatmentPlan, "МОД", "anamnesis surface treatment plan field");
assert(anamnesisSurfaceDraft.quality?.signals.includes("anamnesis_detected"), "quality must detect anamnesis");
assert(anamnesisSurfaceDraft.quality?.signals.includes("procedure_mentioned"), "quality must detect MOD restoration procedure");

const codeAndPlanTranscript = [
  "Жалобы реакция на сладкое зуб один четыре.",
  "Объективно зуб 14, кариозная полость, зондирование болезненное.",
  "Диагноз МКБ ка ноль два точка один кариес дентина зуб 14.",
  "Выполнена инфильтрационная анестезия.",
  "Проведены препарирование и адгезивный протокол.",
  "Назначены рекомендации контроль при боли."
].join(" ");
const codeAndPlanDraft = buildRuleBasedVisitDraftFromTranscript(codeAndPlanTranscript, "therapist");
const codeAndPlanNormalized = normalizeDentalSpeechTranscript(codeAndPlanTranscript, "therapist");

includesText(codeAndPlanNormalized.normalizedText, "K02.1", "code and plan normalized transcript");
includesText(codeAndPlanNormalized.normalizedText, "МКБ-10", "code and plan normalized transcript");
includesText(codeAndPlanDraft.complaint, "зуб 14", "code and plan complaint field");
includesText(codeAndPlanDraft.objectiveStatus, "зуб 14", "code and plan objective field");
includesText(codeAndPlanDraft.diagnosis, "K02.1", "code and plan diagnosis field");
includesText(codeAndPlanDraft.treatmentPlan, "инфильтрационная", "code and plan treatment plan field");
includesText(codeAndPlanDraft.treatmentPlan, "препарирование", "code and plan treatment plan field");
includesText(codeAndPlanDraft.treatmentPlan, "контроль при боли", "code and plan treatment plan field");
assert(codeAndPlanDraft.quality?.signals.includes("plan_detected"), "quality must detect morphological plan sections");
assert(codeAndPlanDraft.quality?.signals.includes("procedure_mentioned"), "quality must detect morphological procedure sections");

const surgeonTranscript = [
  "Жалобы на боль в области восьмерки.",
  "Объективно зуб 38 дистопирован, перкуссия безболезненная.",
  "Диагноз ретенция и дистопия 38.",
  "Проведено удаление зуба 38, кюретаж лунки, гемостаз, наложены швы."
].join(" ");
const surgeonDraft = buildRuleBasedVisitDraftFromTranscript(surgeonTranscript, "surgeon");
includesText(surgeonDraft.complaint, "восьмерки", "surgeon complaint field");
includesText(surgeonDraft.objectiveStatus, "дистопирован", "surgeon objective field");
includesText(surgeonDraft.diagnosis, "ретенция", "surgeon diagnosis field");
includesText(surgeonDraft.treatmentPlan, "удаление зуба", "surgeon treatment plan field");
includesText(surgeonDraft.treatmentPlan, "лунки", "surgeon treatment plan field");
includesText(surgeonDraft.treatmentPlan, "швы", "surgeon treatment plan field");

const orthopedistTranscript = [
  "Жалобы на выпадение коронки.",
  "Объективно культя зуба 24 сохранена, десна без воспаления.",
  "Диагноз дефект коронковой части зуба 24.",
  "План лечения снятие слепков, изготовление временной коронки."
].join(" ");
const orthopedistDraft = buildRuleBasedVisitDraftFromTranscript(orthopedistTranscript, "orthopedist");
includesText(orthopedistDraft.complaint, "выпадение коронки", "orthopedist complaint field");
includesText(orthopedistDraft.objectiveStatus, "культя", "orthopedist objective field");
includesText(orthopedistDraft.diagnosis, "дефект коронковой части", "orthopedist diagnosis field");
includesText(orthopedistDraft.treatmentPlan, "снятие слепков", "orthopedist treatment plan field");
includesText(orthopedistDraft.treatmentPlan, "временной коронки", "orthopedist treatment plan field");

const orthodontistTranscript = [
  "Жалобы на неровные зубы.",
  "Объективно скученность зубов на нижней челюсти.",
  "Диагноз дистальный прикус.",
  "Лечение фиксация брекет системы на нижнюю челюсть, установка дуги."
].join(" ");
const orthodontistDraft = buildRuleBasedVisitDraftFromTranscript(orthodontistTranscript, "orthodontist");
includesText(orthodontistDraft.complaint, "неровные зубы", "orthodontist complaint field");
includesText(orthodontistDraft.objectiveStatus, "скученность зубов", "orthodontist objective field");
includesText(orthodontistDraft.diagnosis, "дистальный прикус", "orthodontist diagnosis field");
includesText(orthodontistDraft.treatmentPlan, "фиксация брекет", "orthodontist treatment plan field");
includesText(orthodontistDraft.treatmentPlan, "установка дуги", "orthodontist treatment plan field");

const hygienistTranscript = [
  "Жалобы на кровоточивость десен.",
  "Объективно мягкий и твердый зубной налет, десна гиперемирована.",
  "Диагноз хронический гингивит.",
  "Проведена ультразвуковая чистка, эйр флоу, полировка пастой, фторирование."
].join(" ");
const hygienistDraft = buildRuleBasedVisitDraftFromTranscript(hygienistTranscript, "hygienist");
includesText(hygienistDraft.complaint, "кровоточивость десен", "hygienist complaint field");
includesText(hygienistDraft.objectiveStatus, "зубной налет", "hygienist objective field");
includesText(hygienistDraft.diagnosis, "хронический гингивит", "hygienist diagnosis field");
includesText(hygienistDraft.treatmentPlan, "ультразвуковая", "hygienist treatment plan field");
includesText(hygienistDraft.treatmentPlan, "Air Flow", "hygienist treatment plan field");
includesText(hygienistDraft.treatmentPlan, "фторирование", "hygienist treatment plan field");

console.log(
  JSON.stringify({
    ok: true,
    checked: "russian dental speech normalization and visit draft mapping",
    toothCodes: draft.quality?.detectedToothCodes ?? []
  })
);
