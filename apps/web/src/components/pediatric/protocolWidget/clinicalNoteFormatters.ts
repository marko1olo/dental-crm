import { PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION, PEDIATRIC_TEETH_NAMES } from "./constants";
import type { FranklExpressItem, PediatricServiceItem } from "./types";

interface ClinicalNoteBuilderParams {
	readonly repLine: string;
	readonly activeFrankl: FranklExpressItem;
	readonly somaticLine: string;
	readonly orthoFrenulumNormal: boolean;
	readonly orthoNasalBreathing: boolean;
	readonly orthoNoHarmfulHabits: boolean;
	readonly currentTooth: number;
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly services: readonly PediatricServiceItem[];
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly recommendations: string;
}

export function buildFullClinicalNoteText(p: ClinicalNoteBuilderParams): string {
	return [
		"ДНЕВНИК ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (МЕДИЦИНСКАЯ КАРТА)",
		"────────────────────────────────────────────────────────────",
		`1. Родитель / Сопровождающий:\n   ${p.repLine}`,
		"",
		`2. Психоэмоциональный статус (Шкала Франкла): Рейтинг ${p.activeFrankl.rating} (${p.activeFrankl.symbol}) — ${p.activeFrankl.titleRu}`,
		`   Поведение: ${p.activeFrankl.descriptionRu}\n   Тактика адаптации: ${p.activeFrankl.clinicalTacticRu}`,
		"",
		`3. Соматический статус ребенка:\n   ${p.somaticLine}`,
		"",
		"4. Первичный осмотр и ортодонтический скрининг:",
		`   • Уздечки губ и языка: ${p.orthoFrenulumNormal ? "норма (анатомически правильное прикрепление)" : "патология прикрепления (требуется консультация ортодонта/хирурга)"}`,
		`   • Носовое дыхание: ${p.orthoNasalBreathing ? "сохранено (свободное через нос)" : "нарушено (ротовое дыхание)"}`,
		`   • Вредные привычки: ${p.orthoNoHarmfulHabits ? "отсутствуют" : "выявлены (сосание пальца/губы/предметов, инфантильное глотание)"}`,
		"",
		`5. Объект вмешательства: Зуб #${p.currentTooth} (${PEDIATRIC_TEETH_NAMES[p.currentTooth] ?? `Зуб ${p.currentTooth}`})`,
		`   Диагноз (МКБ-10): ${p.diagnosisIcd10} — ${p.diagnosisNameRu}`,
		`   Услуги и манипуляции: ${p.services.map((s) => `${s.code} ${s.nameRu}`).join("; ")}`,
		"",
		`6. Осмотр и зубная формула:\n   ${p.statusLocalis}`,
		"",
		`7. Протокол вмешательства и манипуляции:\n   ${p.treatmentDescription}`,
		"",
		`8. Назначения и рекомендации родителям:\n   ${p.recommendations}`,
		"────────────────────────────────────────────────────────────",
		"Протокол осмотра и лечения в медицинской карте пациента.",
	].join("\n");
}

export function buildPhysiologicalNormClinicalNoteText(): string {
	return [
		"ДНЕВНИК ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (МЕДИЦИНСКАЯ КАРТА)",
		"────────────────────────────────────────────────────────────",
		"1. Психоэмоциональный статус (Шкала Франкла): Рейтинг 4 (++) — 4 (++) Определенно позитивное",
		"   Поведение: Восторжен, искренний интерес, улыбка, абсолютное доверие",
		"   Тактика адаптации: Партнерство, обучение самостоятельной чистке зубов, диплом храброго пациента",
		"",
		"2. Первичный осмотр и ортодонтический скрининг:",
		"   • Уздечки губ и языка: норма (анатомически правильное прикрепление)",
		"   • Носовое дыхание: сохранено (свободное через нос)",
		"   • Вредные привычки: отсутствуют",
		"",
		"3. Объект осмотра: Временный прикус (зубы 51..85)",
		`   Диагноз (МКБ-10): ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisIcd10} — ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisNameRu}`,
		`   Услуга: ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceCode || PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceCode804n} — ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceName || PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.serviceName804n}`,
		"",
		`4. Осмотр и зубная формула (физиологическая норма):\n   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.statusLocalisRu}`,
		"",
		`5. Профилактический протокол:\n   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.treatmentRu}`,
		"",
		`6. Рекомендации родителям:\n   ${PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.recommendationsRu}`,
		"────────────────────────────────────────────────────────────",
	].join("\n");
}

/** @deprecated Использовать buildPhysiologicalNormClinicalNoteText */
export const buildPhysiologicalNorm043Text = buildPhysiologicalNormClinicalNoteText;

export function buildAdaptationVisitClinicalNoteText(): string {
	return [
		"ДНЕВНИК ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (МЕДИЦИНСКАЯ КАРТА)",
		"────────────────────────────────────────────────────────────",
		"1. Психоэмоциональный статус (Шкала Франкла): Рейтинг 3 (+) — 3 (+) Позитивное / контактен",
		"   Поведение: Контактен, сотрудничает, спокойно выполняет указания врача",
		"   Тактика адаптации: Tell-Show-Do, ознакомление в игровой форме («считаем зубки»), похвала",
		"",
		"2. Первичный осмотр и ортодонтический скрининг:",
		"   • Уздечки губ и языка: норма (анатомически правильное прикрепление)",
		"   • Носовое дыхание: сохранено (свободное через нос)",
		"   • Вредные привычки: отсутствуют",
		"",
		"3. Объект осмотра: Адаптационный приём без препарирования (зубы 51..85)",
		"   Диагноз (МКБ-10): Z01.2 — Стоматологическое обследование / адаптация к стоматологическому приему (Z01.2)",
		"   Услуги и манипуляции: A01.07.001 Прием (осмотр, консультация) врача-стоматолога детского первичный; A14.07.003 Обучение гигиене полости рта",
		"",
		"4. Осмотр и зубная формула:",
		"   Временный прикус. Слизистая оболочка полости рта бледно-розовая, чистая, влажная. Состояние зубов удовлетворительное. Зубные ряды правильной формы. Окклюзионные взаимоотношения гармоничны.",
		"",
		"5. Протокол адаптационного приема (без сверления):",
		"   Психологическая адаптация по методике Tell-Show-Do («Расскажи-Покажи-Сделай»). Знакомство с кабинетом, игра «катание на волшебном кресле», демонстрация зеркала и пустера («ветерок»). Осмотр зубов в игровой форме («считаем зубки»). Щеточкой с бесфтористой пастой мягко очищены окклюзионные поверхности, проведена аппликация реминерализующего геля. Ребенок спокоен, контакт установлен, позитивное подкрепление (вручен диплом храброго пациента и подарок). Страх перед стоматологом отсутствует.",
		"",
		"6. Назначения и рекомендации родителям:",
		"   1. Поддерживать позитивное отношение к стоматологу дома (без пугающих фраз). 2. Чистка зубов 2 раза в день фторидной пастой (1000 ppm) под контролем родителей. 3. Повторный визит через 3–4 недели для планового осмотра / лечения.",
		"────────────────────────────────────────────────────────────",
		"Протокол осмотра и лечения в медицинской карте пациента.",
	].join("\n");
}

/** @deprecated Использовать buildAdaptationVisitClinicalNoteText */
export const buildAdaptationVisit043Text = buildAdaptationVisitClinicalNoteText;

