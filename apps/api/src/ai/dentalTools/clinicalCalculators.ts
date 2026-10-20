/**
 * clinicalCalculators.ts — Клинический стоматологический арсенал:
 * расчеты анестезии, скрининг соматики, протокол Формы 043/у (СтАР),
 * консилиум, экстренная помощь (гипохлорит/облом/анафилаксия), перевод жалоб и выбор материалов.
 */

import {
	ANESTHESIA_FORMULATIONS,
	DENTAL_PROTOCOLS,
	EMERGENCY_PROTOCOLS,
} from "@dental/shared";
import { z } from "zod";
import {
	type DentalToolContext,
	type DentalToolEntry,
	createOpenAIToolDefinition,
} from "./types.js";

// ============================================================================
// 1. TOOL: calculate_anesthesia
// ============================================================================

export const calculateAnesthesiaSchema = z.object({
	patientWeightKg: z
		.number()
		.min(5, "Масса тела пациента должна быть не менее 5 кг")
		.max(300, "Масса тела пациента не может превышать 300 кг")
		.describe("Масса тела пациента в килограммах (строго > 0)"),
	anestheticType: z
		.enum(["articaine_1_100000", "articaine_1_200000", "mepivacaine_3_plain", "auto"])
		.default("auto")
		.describe(
			"Тип анестетика: articaine_1_100000 (Ультракаин Форте), articaine_1_200000 (Ультракаин Д-С), mepivacaine_3_plain (Скандонест без адреналина) или auto (автовыбор по соматике)",
		),
	hasCardiovascularRisk: z
		.boolean()
		.default(false)
		.describe(
			"Наличие сердечно-сосудистой патологии (ИБС, гипертония II-III ст, неселективные бета-блокаторы, аритмия, инфаркт в анамнезе)",
		),
	isPregnancy: z
		.boolean()
		.default(false)
		.describe("Беременность (рекомендован пониженный вазоконстриктор 1:200 000)"),
	plannedCarpules: z
		.number()
		.min(0.5, "Минимум 0.5 карпулы")
		.max(15, "Максимум 15 карпул")
		.default(1)
		.describe("Планируемое врачом количество карпул (по умолчанию 1)"),
});

export type CalculateAnesthesiaInput = z.input<typeof calculateAnesthesiaSchema>;

export interface CalculateAnesthesiaResult {
	readonly drugName: string;
	readonly tradeNameSample: string;
	readonly concentrationPercent: number;
	readonly vasoconstrictorRatio: string | null;
	readonly patientWeightKg: number;
	readonly maxDoseMg: number;
	readonly mgPerCarpule: number;
	readonly maxCarpulesByAnesthetic: number;
	readonly maxCarpulesByEpinephrine: number;
	readonly absoluteMaxCarpules: number;
	readonly recommendedCarpules: number;
	readonly plannedCarpules: number;
	readonly epinephrineMcgPerCarpule: number;
	readonly totalEpinephrineMcg: number;
	readonly maxSafeEpinephrineMcg: number;
	readonly isCardiovascularRisk: boolean;
	readonly isPregnancy: boolean;
	readonly warnings: readonly string[];
	readonly safeToProceed: boolean;
	readonly clinicalProtocolSummary: string;
}

export async function handleCalculateAnesthesia(
	args: CalculateAnesthesiaInput,
	_context: DentalToolContext,
): Promise<CalculateAnesthesiaResult> {
	const weight = args.patientWeightKg;
	const hasCardio = args.hasCardiovascularRisk ?? false;
	const isPregnancy = args.isPregnancy ?? false;
	const planned = args.plannedCarpules ?? 1;

	let selectedType = args.anestheticType ?? "auto";
	const warnings: string[] = [];

	if (selectedType === "auto") {
		if (hasCardio) {
			selectedType = "mepivacaine_3_plain";
		} else if (isPregnancy) {
			selectedType = "articaine_1_200000";
		} else {
			selectedType = "articaine_1_100000";
		}
	} else if (hasCardio && selectedType === "articaine_1_100000") {
		warnings.push(
			"КЛИНИЧЕСКОЕ ПРЕДОСТЕРЕЖЕНИЕ (СтАР): При сердечно-сосудистой патологии (ИБС, гипертония, бета-блокаторы) раствор 1:100 000 несет риск гипертонического криза. Рекомендовано переключение на 1:200 000 либо Мепивакаин 3% без вазоконстриктора.",
		);
	}

	let drugName = "Артикаин 4% с эпинефрином 1:100 000";
	let tradeNameSample = "Ультракаин Д-С форте / Септанест 1:100 000";
	let concentrationPercent = 4;
	let vasoconstrictorRatio: string | null = "1:100 000";
	let mrdMgPerKg = 7.0;
	let absoluteMaxMg = 500;
	let mgPerCarpule = 68; // 40 мг/мл * 1.7 мл
	let epinephrineMcgPerCarpule = 17; // 10 мкг/мл * 1.7 мл
	let maxSafeEpinephrineMcg = hasCardio ? 40 : 200; // 0.04 мг для кардио, 0.2 мг для здоровых

	if (selectedType === "articaine_1_200000") {
		drugName = "Артикаин 4% с эпинефрином 1:200 000";
		tradeNameSample = "Ультракаин Д-С / Убистезин 1:200 000";
		concentrationPercent = 4;
		vasoconstrictorRatio = "1:200 000";
		mrdMgPerKg = 7.0;
		absoluteMaxMg = 500;
		mgPerCarpule = 68;
		epinephrineMcgPerCarpule = 8.5; // 5 мкг/мл * 1.7 мл
	} else if (selectedType === "mepivacaine_3_plain") {
		drugName = "Мепивакаин 3% без вазоконстриктора";
		tradeNameSample = "Скандонест 3% / Мепивастезин";
		concentrationPercent = 3;
		vasoconstrictorRatio = null;
		mrdMgPerKg = 4.4;
		absoluteMaxMg = 300;
		mgPerCarpule = 51; // 30 мг/мл * 1.7 мл
		epinephrineMcgPerCarpule = 0;
		maxSafeEpinephrineMcg = 0;
	}

	// 1. Расчет по действующему веществу анестетика
	const maxDoseMg = Math.min(Math.round(weight * mrdMgPerKg), absoluteMaxMg);
	const maxCarpulesByAnesthetic = Math.floor(maxDoseMg / mgPerCarpule);

	// 2. Расчет по вазоконстриктору (адреналину)
	let maxCarpulesByEpinephrine = 999;
	if (epinephrineMcgPerCarpule > 0 && maxSafeEpinephrineMcg > 0) {
		maxCarpulesByEpinephrine = Math.floor(maxSafeEpinephrineMcg / epinephrineMcgPerCarpule);
	}

	const absoluteMaxCarpules = Math.max(
		1,
		Math.min(maxCarpulesByAnesthetic, maxCarpulesByEpinephrine),
	);
	const recommendedCarpules = Math.min(planned, absoluteMaxCarpules);
	const totalEpinephrineMcg = Number((recommendedCarpules * epinephrineMcgPerCarpule).toFixed(1));

	if (planned > absoluteMaxCarpules) {
		warnings.push(
			`Превышение дозы: Запланировано ${planned} карп., что превышает безопасный лимит (${absoluteMaxCarpules} карп. для массы ${weight} кг). Доза ограничена ${recommendedCarpules} карп.`,
		);
	}

	const clinicalProtocolSummary = [
		`Анестетик: ${drugName} (${tradeNameSample}).`,
		`Пациент: ${weight} кг. Предел активного вещества: ${maxDoseMg} мг (${absoluteMaxCarpules} карп. по 1.7 мл).`,
		`К введению: ${recommendedCarpules} карп. (${recommendedCarpules * mgPerCarpule} мг анестетика).`,
		epinephrineMcgPerCarpule > 0
			? `Нагрузка адреналина: ${totalEpinephrineMcg} мкг из допустимых ${maxSafeEpinephrineMcg} мкг.`
			: `Без адреналина (кардио-профиль).`,
		warnings.length > 0 ? `ВНИМАНИЕ: ${warnings.join(" ")}` : "Соматических ограничений нет.",
	].join(" ");

	return {
		drugName,
		tradeNameSample,
		concentrationPercent,
		vasoconstrictorRatio,
		patientWeightKg: weight,
		maxDoseMg,
		mgPerCarpule,
		maxCarpulesByAnesthetic,
		maxCarpulesByEpinephrine,
		absoluteMaxCarpules,
		recommendedCarpules,
		plannedCarpules: planned,
		epinephrineMcgPerCarpule,
		totalEpinephrineMcg,
		maxSafeEpinephrineMcg,
		isCardiovascularRisk: hasCardio,
		isPregnancy,
		warnings,
		safeToProceed: true,
		clinicalProtocolSummary,
	};
}

export const calculateAnesthesiaTool: DentalToolEntry<typeof calculateAnesthesiaSchema> = {
	name: "calculate_anesthesia",
	description:
		"Расчет клинически безопасной дозировки местного анестетика (артикаин 4% 1:100 000, 1:200 000, мепивакаин 3%) по массе тела пациента в кг и кардио-рискам. Лимиты СтАР: 7.0 мг/кг, потолок 500 мг, адреналин макс 0.04 мг при гипертонии/ИБС.",
	schema: calculateAnesthesiaSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"calculate_anesthesia",
		"Расчет дозировки местного анестетика по массе тела пациента и соматике (артикаин 4%, мепивакаин 3%). Соответствует стандартам СтАР.",
		calculateAnesthesiaSchema,
	),
	handler: handleCalculateAnesthesia,
};

// ============================================================================
// 2. TOOL: check_somatic_risks_and_contraindications
// ============================================================================

export const checkSomaticRisksSchema = z.object({
	conditions: z
		.array(z.string())
		.default([])
		.describe(
			"Список соматических заболеваний пациента (гипертония, ИБС, сахарный диабет, бронхиальная астма, остеопороз, аритмия)",
		),
	medications: z
		.array(z.string())
		.default([])
		.describe(
			"Принимаемые пациентом лекарственные препараты (варфарин, ксарелто, аспирин, бисфосфонаты, анаприлин, инсулин)",
		),
	allergies: z
		.array(z.string())
		.default([])
		.describe("Лекарственные аллергии (пенициллин, амоксиклав, НПВС, новокаин, йод)"),
	plannedIntervention: z
		.enum(["anesthesia", "tooth_extraction", "implant_surgery", "routine_therapy", "endodontics"])
		.default("routine_therapy")
		.describe("Планируемое вмешательство у кресла"),
});

export type CheckSomaticRisksInput = z.infer<typeof checkSomaticRisksSchema>;

export interface CheckSomaticRisksResult {
	readonly highRiskFlags: readonly string[];
	readonly contraindications: readonly string[];
	readonly drugInteractions: readonly string[];
	readonly recommendations: readonly string[];
	readonly safeToProceed: boolean;
	readonly requiresConsultation: boolean;
}

export async function handleCheckSomaticRisks(
	args: CheckSomaticRisksInput,
	_context: DentalToolContext,
): Promise<CheckSomaticRisksResult> {
	const conditions = (args.conditions ?? []).map((c) => c.toLowerCase());
	const meds = (args.medications ?? []).map((m) => m.toLowerCase());
	const allergies = (args.allergies ?? []).map((a) => a.toLowerCase());
	const intervention = args.plannedIntervention ?? "routine_therapy";

	const highRiskFlags: string[] = [];
	const contraindications: string[] = [];
	const drugInteractions: string[] = [];
	const recommendations: string[] = [];

	// 1. Антикоагулянты и антиагреганты
	const hasAnticoagulants =
		meds.some((m) => /варфарин|ксарелт|ривароксабан|прадакс|дабигатран|эликвис|апиксабан/i.test(m)) ||
		conditions.some((c) => /тромбоз|мерцательн|протез клапан/i.test(c));
	const hasAntiplatelets = meds.some((m) => /аспирин|тромбо асс|кардиомагнил|клопидогрел|плавикс/i.test(m));

	if (hasAnticoagulants || hasAntiplatelets) {
		highRiskFlags.push("Высокий риск длительного луночкового кровотечения.");
		if (intervention === "tooth_extraction" || intervention === "implant_surgery") {
			recommendations.push(
				"Хирургический протокол гемостаза: атравматичное удаление, резорбируемая гемостатическая губка, плотное ушивание лунки полигликолидными швами, аппликации транексамовой кислоты.",
			);
			recommendations.push(
				"Варфарин: контроль МНО за 24-48 ч до вмешательства (безопасный диапазон МНО 2.0–2.5). Самовольная отмена антикоагулянтов пациентом ЗАПРЕЩЕНА из-за риска тромбоэмболии.",
			);
		}
	}

	// 2. Бисфосфонаты и риск остеонекроза челюсти (MRONJ / БОНЧ)
	const hasBisphosphonates = meds.some((m) =>
		/бисфосфонат|золендрон|акласт|зомет|алендрон|фосамакс|ибандрон|бонвив|деносумаб|пролиа/i.test(m),
	);
	if (hasBisphosphonates) {
		highRiskFlags.push("КРИТИЧЕСКИЙ РИСК: Медикаментозный остеонекроз челюсти (MRONJ).");
		if (intervention === "tooth_extraction" || intervention === "implant_surgery") {
			contraindications.push(
				"Плановая дентальная имплантация и травматичные удаления зубов противопоказаны без консилиума с онкологом/эндокринологом.",
			);
			recommendations.push(
				"При неотложном удалении: максимальная атравматичность, сглаживание костных краев, первичное ушивание слизисто-надкостничным лоскутом без натяжения, периоперационная антибиотикопрофилактика.",
			);
		}
	}

	// 3. Артериальная гипертензия и бета-блокаторы
	const hasHypertension = conditions.some((c) => /гипертон|гипертенз|криз|\bаг\b|\bгб\b/i.test(c));
	const hasNonSelectiveBetaBlocker = meds.some((m) => /анаприлин|пропранолол|соталол/i.test(m));
	if (hasHypertension || hasNonSelectiveBetaBlocker) {
		highRiskFlags.push("Риск адреналин-индуцированного гипертонического криза.");
		drugInteractions.push(
			"Неселективные бета-блокаторы + адреналин: блокада бета-2 рецепторов приводит к беспрепятственной стимуляции альфа-1 сосудов, вызывая резкий спазм и тяжелый скачок АД.",
		);
		recommendations.push(
			"Анестезия: максимальная доза адреналина 0.04 мг (макс 2 карпулы 1:100 000 или 4 карпулы 1:200 000). Предпочтителен Мепивакаин 3% без вазоконстриктора.",
		);
	}

	// 4. Сахарный диабет
	const hasDiabetes = conditions.some((c) => /диабет|инсулин|\bсд\b/i.test(c));
	if (hasDiabetes) {
		recommendations.push(
			"Сахарный диабет: риск замедленной эпителизации и вторичной инфекции. Назначать утренние визиты после приема пищи и плановой дозы инсулина/сахароснижающих.",
		);
	}

	// 5. Аллергия на пенициллины
	const hasPenicillinAllergy = allergies.some((a) =>
		/пенициллин|амоксиклав|аугментин|амоксициллин|флемоксин|ампициллин/i.test(a),
	);
	if (hasPenicillinAllergy) {
		contraindications.push("Абсолютно противопоказаны антибиотики пенициллинового ряда.");
		recommendations.push(
			"Антибиотикопрофилактика альтернативными рядами: Клиндамицин (300 мг) либо Азитромицин / Кларитромицин.",
		);
	}

	// 6. Аллергия на НПВС
	const hasNsaidAllergy = allergies.some((a) =>
		/нпвс|аспирин|ибупрофен|кеторол|нимесил|диклофенак/i.test(a),
	);
	if (hasNsaidAllergy) {
		contraindications.push("Противопоказаны классические НПВС (кеторол, ибупрофен, нимесулид).");
		recommendations.push("Купирование послеоперационной боли: Парацетамол (до 1000 мг до 4 раз в сутки).");
	}

	const requiresConsultation = hasBisphosphonates || hasAnticoagulants;
	const safeToProceed = contraindications.length === 0;

	return {
		highRiskFlags,
		contraindications,
		drugInteractions,
		recommendations,
		safeToProceed,
		requiresConsultation,
	};
}

export const checkSomaticRisksTool: DentalToolEntry<typeof checkSomaticRisksSchema> = {
	name: "check_somatic_risks_and_contraindications",
	description:
		"Экспертный скрининг соматических заболеваний и лекарственных взаимодействий (антикоагулянты, бисфосфонаты и MRONJ, гипертония, диабет, аллергия на пенициллин и НПВС). Защита от осложнений.",
	schema: checkSomaticRisksSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"check_somatic_risks_and_contraindications",
		"Скрининг соматических патологий, антикоагулянтов, бисфосфонатов и лекарственных аллергий перед приемом.",
		checkSomaticRisksSchema,
	),
	handler: handleCheckSomaticRisks,
};

// ============================================================================
// 3. TOOL: generate_form_043_entry
// ============================================================================

export const generateForm043Schema = z.object({
	toothNumber: z
		.number()
		.min(11)
		.max(85)
		.describe("Номер зуба по формуле FDI (11-48 постоянные, 51-85 молочные)"),
	diagnosisMkb: z
		.string()
		.describe("Диагноз по МКБ-10 (например, K02.1 Кариес дентина, K04.0 Пульпит, K04.5 Периодонтит)"),
	complaints: z
		.string()
		.optional()
		.describe("Краткие жалобы пациента (если не указаны, генерируются клинически)"),
	anestheticTradeName: z
		.string()
		.default("Ультракаин Д-С 1:200 000")
		.describe("Торговое название использованного анестетика"),
	anestheticVolumeMl: z
		.number()
		.default(1.7)
		.describe("Объем анестетика в мл"),
	anesthesiaTechnique: z
		.enum(["infiltration", "conduction", "application", "intraligamentary"])
		.default("infiltration")
		.describe("Техника анестезии: infiltration (инфильтрационная), conduction (проводниковая)"),
	fillingMaterial: z
		.string()
		.default("Светоотверждаемый композит Estelite Asteria A2")
		.describe("Пломбировочный / реставрационный материал"),
	useCofferdam: z
		.boolean()
		.default(true)
		.describe("Применение коффердама (раббердама)"),
});

export type GenerateForm043Input = z.infer<typeof generateForm043Schema>;

export interface GenerateForm043Result {
	readonly toothNumber: number;
	readonly diagnosisMkb: string;
	readonly complaints: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly treatmentProtocol: string;
	readonly recommendations: string;
	readonly fullForm043Text: string;
}

export async function handleGenerateForm043(
	args: GenerateForm043Input,
	_context: DentalToolContext,
): Promise<GenerateForm043Result> {
	const tooth = args.toothNumber;
	const mkb = args.diagnosisMkb.toUpperCase();
	const techName =
		args.anesthesiaTechnique === "conduction"
			? "проводниковая (мандибулярная/торусальная)"
			: args.anesthesiaTechnique === "application"
				? "аппликационная"
				: "инфильтрационная";

	let complaints = args.complaints || "";
	let objective = "";
	let anamnesis = "Со слов пациента, ранее зуб не лечен, симптомы появились несколько дней назад.";

	if (mkb.includes("K02.1")) {
		if (!complaints) {
			complaints = `Жалобы на кратковременные боли от сладкого и термических раздражителей (холодного) в области зуба ${tooth}.`;
		}
		objective = `При осмотре: на жевательной/контактной поверхности зуба ${tooth} глубокая кариозная полость в пределах околопульпарного дентина. Зондирование стенок и дна слабо болезненно, дентин размягчен, пигментирован. Перкуссия безболезненна. Термопроба положительная, боль сразу проходит после устранения раздражителя. ЭОД 6 мкА.`;
	} else if (mkb.includes("K04.0")) {
		if (!complaints) {
			complaints = `Жалобы на острые приступообразные самопроизвольные боли в области зуба ${tooth}, усиливающиеся ночью, иррадиирующие по ходу тройничного нерва.`;
		}
		anamnesis = "Боли беспокоят в течение 2 суток, купировались приемом НПВС кратковременно.";
		objective = `При осмотре: глубокая кариозная полость зуба ${tooth}, сообщающаяся с полостью зуба. Зондирование пульпы резко болезненно, выраженная кровоточивость. Перкуссия слабо чувствительна. Термопроба вызывает длительный нестихающий болевой приступ. ЭОД 25 мкА.`;
	} else if (mkb.includes("K04.5") || mkb.includes("K04.4")) {
		if (!complaints) {
			complaints = `Жалобы на постоянную ноющую боль в области зуба ${tooth}, резкое усиление боли при накусывании («чувство выросшего зуба»).`;
		}
		objective = `При осмотре: коронка зуба ${tooth} изменена в цвете, глубокая кариозная полость / несостоятельная пломба. Полость зуба вскрыта, зондирование устьев каналов безболезненно. Вертикальная перкуссия резко положительна. Пальпация по переходной складке слабо болезненна. На рентгенограмме — деструкция костной ткани у верхушки корня с нечеткими контурами.`;
	} else {
		if (!complaints) {
			complaints = `Жалобы на эстетический дефект и шероховатость в области зуба ${tooth}.`;
		}
		objective = `При осмотре: дефект твердых тканей зуба ${tooth}. Зондирование безболезненно. Перкуссия отрицательна. Слизистая оболочка бледно-розовая, без патологии.`;
	}

	const protocolSteps: string[] = [
		`1. Обезболивание: ${techName} анестезия препаратом ${args.anestheticTradeName} ${args.anestheticVolumeMl} мл.`,
	];
	if (args.useCofferdam) {
		protocolSteps.push("2. Наложение коффердама (раббердама), кламп зафиксирован, рабочее поле изолировано.");
	}
	protocolSteps.push(
		"3. Препарирование кариозной полости, некрэктомия твердых тканей под водяным охлаждением, формирование полости.",
	);
	protocolSteps.push("4. Медикаментозная обработка полости 2% раствором хлоргексидина биглюконата, высушивание.");

	if (mkb.includes("K04")) {
		protocolSteps.push(
			"5. Механическая и медикаментозная обработка корневых каналов машинной системой ProTaper под контролем апекслокатора. Ирригация 3% NaOCl с ультразвуковой активацией.",
		);
		protocolSteps.push(
			"6. Высушивание каналов бумажными штифтами. Пломбирование корневых каналов методом латеральной конденсации гуттаперчи с силером AH Plus. Рентген-контроль обтурации.",
		);
	}

	protocolSteps.push(
		`7. Адгезивный протокол (самопротравливающий адгезив), послойное моделирование анатомической формы зуба материалом ${args.fillingMaterial}. Светополимеризация.`,
	);
	protocolSteps.push("8. Шлифовка, полировка реставрации полировочными головками и пастой. Коррекция по окклюзии.");

	const recommendations =
		"Соблюдение индивидуальной гигиены полости рта. Не принимать твердую пищу в течение 2 часов. При сохранении дискомфорта — повторный осмотр. Профилактический осмотр через 6 месяцев.";

	const fullForm043Text = `=== МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО (ФОРМА № 043/У) ===
Зуб: ${tooth}
Диагноз (МКБ-10): ${mkb}

ЖАЛОБЫ:
${complaints}

АНАМНЕЗ ЗАБОЛЕВАНИЯ:
${anamnesis}

ДАННЫЕ ОБЪЕКТИВНОГО ИССЛЕДОВАНИЯ (STATUS LOCALIS):
${objective}

ЛЕЧЕНИЕ:
${protocolSteps.join("\n")}

РЕКОМЕНДАЦИИ:
${recommendations}
======================================================================`;

	return {
		toothNumber: tooth,
		diagnosisMkb: mkb,
		complaints,
		anamnesis,
		statusLocalis: objective,
		treatmentProtocol: protocolSteps.join("\n"),
		recommendations,
		fullForm043Text,
	};
}

export const generateForm043Tool: DentalToolEntry<typeof generateForm043Schema> = {
	name: "generate_form_043_entry",
	description:
		"Формирование официального клинического дневника амбулаторного приёма (Форма № 043/у) по регламенту СтАР и МКБ-10 (Жалобы, Анамнез, Status Localis, Протокол лечения, Рекомендации).",
	schema: generateForm043Schema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"generate_form_043_entry",
		"Генерация протокола приема стоматологического пациента Форма 043/у по стандарту СтАР и МКБ-10.",
		generateForm043Schema,
	),
	handler: handleGenerateForm043,
};

// ============================================================================
// 4. TOOL: multidisciplinary_concilium
// ============================================================================

export const multidisciplinaryConciliumSchema = z.object({
	clinicalFindings: z
		.array(z.string())
		.min(1, "Требуется хотя бы одна клиническая находка")
		.describe("Список выявленных патологий (кариес, периодонтит, дефекты зубных рядов, скученность)"),
	patientPreferences: z
		.string()
		.optional()
		.describe("Пожелания пациента (несъемное протезирование, имплантация, бюджет)"),
});

export type MultidisciplinaryConciliumInput = z.infer<typeof multidisciplinaryConciliumSchema>;

export interface TreatmentPlanStage {
	readonly stageNumber: number;
	readonly stageName: string;
	readonly specialty: string;
	readonly priority: "immediate" | "high" | "scheduled";
	readonly procedures: readonly string[];
	readonly rationale: string;
}

export interface MultidisciplinaryConciliumResult {
	readonly stages: readonly TreatmentPlanStage[];
	readonly totalStagesCount: number;
	readonly estimatedDurationMonths: number;
	readonly synthesisSummary: string;
}

export async function handleMultidisciplinaryConcilium(
	args: MultidisciplinaryConciliumInput,
	_context: DentalToolContext,
): Promise<MultidisciplinaryConciliumResult> {
	const findings = args.clinicalFindings;
	const findingsStr = findings.join("; ").toLowerCase();

	const stages: TreatmentPlanStage[] = [
		{
			stageNumber: 1,
			stageName: "Неотложный этап (Купирование острой патологии)",
			specialty: "Хирургия / Терапия неотложная",
			priority: "immediate",
			procedures: [
				"Купирование болевого синдрома и одонтогенного воспаления",
				"Вскрытие поднадкостничных абсцессов при наличии",
				"Удаление зубов с продольным переломом корня или подвижностью IV степени",
			],
			rationale: "Ликвидация острой боли и очагов гнойной инфекции перед плановыми манипуляциями.",
		},
		{
			stageNumber: 2,
			stageName: "Пародонтологический этап & Профессиональная гигиена",
			specialty: "Пародонтология / Гигиена",
			priority: "high",
			procedures: [
				"Ультразвуковой скейлинг над- и поддесневых зубных отложений",
				"Обработка аппаратом Air-Flow (глициновый порошок)",
				"Обучение контролируемой индивидуальной гигиене полости рта",
				"Вектор-терапия / кюретаж пародонтальных карманов при пародонтите",
			],
			rationale: "Устранение бактериального фактора. Без санации десен имплантация и протезирование противопоказаны.",
		},
		{
			stageNumber: 3,
			stageName: "Терапевтическая санация твердых тканей и эндодонтия",
			specialty: "Терапевтическая стоматология",
			priority: "scheduled",
			procedures: [
				"Лечение кариеса всех локализаций (герметизация фиссур, композитные реставрации)",
				"Эндодонтическое лечение и ревизия ранее леченных каналов под микроскопом",
				"Восстановление культей зубов под ортопедические коронки со стекловолоконными штифтами",
			],
			rationale: "Подготовка надежного биологического фундамента и герметизация корневых каналов.",
		},
		{
			stageNumber: 4,
			stageName: "Хирургический и ортодонтический этапы",
			specialty: "Хирургия-имплантология / Ортодонтия",
			priority: "scheduled",
			procedures: [
				"Атравматичное удаление зубов, не подлежащих восстановлению, и дистопированных ретинированных восьмерок",
				"Костная пластика (НКР, синус-лифтинг) при дефиците альвеолярного объема",
				"Установка дентальных имплантатов",
				findingsStr.includes("прикус") || findingsStr.includes("скученност")
					? "Ортодонтическая коррекция прикуса элайнерами/брекетами для создания места под протезирование"
					: "Ортодонтическая коррекция при наличии показаний",
			],
			rationale: "Восстановление утраченных опорных структур и нормализация окклюзионных взаимоотношений.",
		},
		{
			stageNumber: 5,
			stageName: "Ортопедический этап (Функционально-эстетическая реабилитация)",
			specialty: "Ортопедическая стоматология",
			priority: "scheduled",
			procedures: [
				"Временное протезирование (провизорные коронки/мосты) для адаптации височно-нижнечелюстного сустава",
				"Постоянное протезирование: коронки из диоксида циркония / E.max с винтовой фиксацией на имплантатах",
				"Окклюзионный контроль и сплинт-терапия при признаках бруксизма",
			],
			rationale: "Полное восстановление жевательной эффективности, окклюзионной высоты и эстетики улыбки.",
		},
		{
			stageNumber: 6,
			stageName: "Диспансерный поддерживающий этап",
			specialty: "Профилактика",
			priority: "scheduled",
			procedures: [
				"Контрольные осмотры 1 раз в 6 месяцев",
				"Рентген-контроль стабильности периимплантной кости (RVG/ОПТГ)",
				"Регулярная поддерживающая пародонтальная терапия",
			],
			rationale: "Долгосрочное сохранение гарантии и клинического успеха комплексного лечения.",
		},
	];

	const estimatedDurationMonths = findingsStr.includes("имплант") ? 6 : 2;

	return {
		stages,
		totalStagesCount: stages.length,
		estimatedDurationMonths,
		synthesisSummary: `Сформирован 6-этапный междисциплинарный план лечения по алгоритму СтАР. Примерная продолжительность: ${estimatedDurationMonths} мес. Включает пародонтологическую подготовку, терапию, хирургию и завершающее протезирование.`,
	};
}

export const multidisciplinaryConciliumTool: DentalToolEntry<typeof multidisciplinaryConciliumSchema> = {
	name: "multidisciplinary_concilium",
	description:
		"Междисциплинарный клинический консилиум: синтез этапного комплексного плана лечения (Неотложный -> Пародонтология/гигиена -> Терапия -> Хирургия/имплантация -> Ортопедия -> Диспансеризация).",
	schema: multidisciplinaryConciliumSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"multidisciplinary_concilium",
		"Синтез комплексного междисциплинарного плана лечения по этапам клинического протокола СтАР.",
		multidisciplinaryConciliumSchema,
	),
	handler: handleMultidisciplinaryConcilium,
};

// ============================================================================
// 5. TOOL: chairside_emergency_rescue
// ============================================================================

export const chairsideEmergencySchema = z.object({
	emergencyType: z
		.enum([
			"hypochlorite_accident",
			"separated_instrument",
			"root_perforation",
			"anaphylactic_shock",
			"swallowed_foreign_body",
		])
		.describe("Тип экстренной клинической ситуации у кресла"),
	toothNumber: z
		.number()
		.min(11)
		.max(48)
		.optional()
		.describe("Номер причинного зуба (при эндодонтических авариях)"),
	details: z
		.string()
		.optional()
		.describe("Клинические детали (например, 'инструмент сломался в апикальной трети', 'отек нарастает')"),
});

export type ChairsideEmergencyInput = z.infer<typeof chairsideEmergencySchema>;

export interface ChairsideEmergencyResult {
	readonly emergencyType: string;
	readonly urgencyLevel: "CRITICAL_RESUSCITATION" | "URGENT_CLINICAL";
	readonly immediateActions: readonly string[];
	readonly pharmacotherapy: readonly string[];
	readonly prognosisAndCommunication: string;
}

export async function handleChairsideEmergency(
	args: ChairsideEmergencyInput,
	_context: DentalToolContext,
): Promise<ChairsideEmergencyResult> {
	const type = args.emergencyType;

	if (type === "anaphylactic_shock") {
		return {
			emergencyType: type,
			urgencyLevel: "CRITICAL_RESUSCITATION",
			immediateActions: [
				"1. НЕМЕДЛЕННО ПРЕКРАТИТЬ ВВЕДЕНИЕ АЛЛЕРГЕНА / АНЕСТЕТИКА!",
				"2. Вызвать реанимационную бригаду скорой помощи (112).",
				"3. Уложить пациента горизонтально с приподнятыми ногами под углом 30-45° (положение Тренделенбурга). Повернуть голову набок при рвоте.",
				"4. ВВЕСТИ ЭПИНЕФРИН (АДРЕНАЛИН 0.1%): 0.5 мл (0.5 мг) В/М В ПЕРЕДНЕБОКОВУЮ ПОВЕРХНОСТЬ СРЕДНЕЙ ТРЕТИ БЕДРА! При отсутствии эффекта повторить через 5 минут.",
				"5. Обеспечить проходимость дыхательных путей, подача 100% увлажненного кислорода через маску (10-15 л/мин).",
				"6. Обеспечить надежный периферический венозный доступ (катетер G16-G18), инфузия 0.9% NaCl 1000 мл струйно.",
			],
			pharmacotherapy: [
				"Адреналин 0.1% — 0.5 мг в/м в бедро (препарат первого выбора, без задержек!).",
				"Преднизолон 90-120 мг в/в (или Дексаметазон 8-16 мг в/в) — для блокирования поздней фазы шока.",
				"Инфузионная терапия: 0.9% NaCl 1000-2000 мл для устранения относительной гиповолемии.",
			],
			prognosisAndCommunication:
				"Жизнеугрожающее состояние. Пациент подлежит обязательной экстренной госпитализации в отделение реанимации.",
		};
	}

	if (type === "hypochlorite_accident") {
		return {
			emergencyType: type,
			urgencyLevel: "URGENT_CLINICAL",
			immediateActions: [
				"1. НЕМЕДЛЕННО прекратить ирригацию гипохлоритом натрия!",
				"2. Аспирировать раствор из корневого канала.",
				"3. Промыть канал обильным количеством стерильного физиологического раствора (0.9% NaCl) для разведения NaOCl.",
				"4. Провести анестезию для купирования острейшего болевого синдрома.",
				"5. Холод на пораженную сторону лица (лед через салфетку интервалами по 15 минут) для ограничения отека.",
				"6. Оставить канал открытым под ватный шарик на 24 часа для дренирования экссудата.",
			],
			pharmacotherapy: [
				"Аналгезия: Кеторол 30 мг в/м или Декскетопрофен (Дексалгин) 50 мг в/м.",
				"Кортикостероиды: Дексаметазон 4-8 мг в/м для купирования токсического тканевого отека.",
				"Антигистаминные: Супрастин / Тавегил 1-2 мл в/м.",
				"Антибиотикотерапия широкого спектра: Амоксиклав 1000 мг 2 р/сут (или Клиндамицин 300 мг 3 р/сут при аллергии) на 5-7 дней для профилактики вторичного некроза.",
			],
			prognosisAndCommunication:
				"Успокоить пациента. Предупредить о формировании обширной гематомы мягких тканей лица в течение 5-7 дней. Ежедневный очный осмотр.",
		};
	}

	if (type === "separated_instrument") {
		return {
			emergencyType: type,
			urgencyLevel: "URGENT_CLINICAL",
			immediateActions: [
				"1. Не паниковать! Категорически запрещено проталкивать инструмент апикально ручными файлами.",
				"2. Сообщить пациенту об инциденте спокойно и профессионально (Мандат 8e / правовая защита).",
				"3. Провести диагностическую прицельную радиовизиографию (локализация: коронковая, средняя или апикальная треть канала, до изгиба или за изгибом).",
				"4. Тактика байпаса (Bypass): попытка обойти фрагмент тонким K-файлом №06/№08 с гелем ЭДТА по внутренней кривизне.",
				"5. Тактика извлечения: при локализации в прямой части канала — ультразвуковая активация (насадки Start-X / ProUltra) без водяного охлаждения под контролем микроскопа.",
				"6. Если извлечение несет риск перфорации корня — обтурация канала вместе с фрагментом (байпас) с последующим рентген-наблюдением.",
			],
			pharmacotherapy: [
				"Гель ЭДТА (RC-Prep, Glyde) для смазки при байпасе.",
				"Гипохлорит натрия 3% + 17% жидкая ЭДТА для медикаментозной дезинфекции стенок канала вокруг отломка.",
			],
			prognosisAndCommunication:
				"Фрагмент инструмента стерилен. При успешном байпасе или надежной обтурации прогноз благоприятный в 80-90% случаев.",
		};
	}

	if (type === "root_perforation") {
		return {
			emergencyType: type,
			urgencyLevel: "URGENT_CLINICAL",
			immediateActions: [
				"1. Остановка кровотечения из зоны перфорации стерильными бумажными штифтами и раствором адреналина 1:1000.",
				"2. Исключить использование гипохлорита натрия высокой концентрации в зоне перфорации! Промывание 2% хлоргексидином.",
				"3. Немедленное герметичное закрытие дефекта материалом ProRoot MTA (Mineral Trioxide Aggregate) или биокерамическим цементом Biodentine.",
				"4. Контрольная рентгенография плотности краевого прилегания МТА.",
			],
			pharmacotherapy: [
				"МТА (Mineral Trioxide Aggregate) / Biodentine / Bio-C Repair — остеоиндуктивные биосовместимые материалы.",
				"НПВС (Нимесил 100 мг) при постманипуляционном дискомфорте.",
			],
			prognosisAndCommunication:
				"При закрытии перфорации в первые часы прогноз благоприятный. При застарелых перфорациях — риск формирования пародонтального кармана.",
		};
	}

	return {
		emergencyType: type,
		urgencyLevel: "URGENT_CLINICAL",
		immediateActions: [
			"1. Прекратить манипуляции.",
			"2. Оценить проходимость дыхательных путей (кашель, стридор, цианоз).",
			"3. При аспирации — прием Геймлиха, вызов скорой.",
			"4. При проглатывании — направить на обзорную рентгенографию брюшной полости.",
		],
		pharmacotherapy: ["Симптоматическая терапия."],
		prognosisAndCommunication: "Контроль эвакуации инородного тела.",
	};
}

export const chairsideEmergencyTool: DentalToolEntry<typeof chairsideEmergencySchema> = {
	name: "chairside_emergency_rescue",
	description:
		"Экспресс-протоколы экстренной помощи у стоматологического кресла: анафилактический шок (адреналин 0.5 мг в/м в бедро), гипохлоритная авария, облом инструмента в канале, перфорация стенки корня (МТА).",
	schema: chairsideEmergencySchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"chairside_emergency_rescue",
		"Протоколы неотложной помощи: анафилаксия, гипохлоритная авария, облом эндофайла, перфорация корня.",
		chairsideEmergencySchema,
	),
	handler: handleChairsideEmergency,
};

// ============================================================================
// 6. TOOL: translate_patient_complaint
// ============================================================================

export const translatePatientComplaintSchema = z.object({
	complaintText: z
		.string()
		.min(3, "Текст жалобы слишком короткий")
		.describe("Прямая речь / жалоба пациента (например, 'ноет по ночам', 'дырка в зубе', 'застревает пища')"),
	toothMentioned: z
		.number()
		.min(11)
		.max(85)
		.optional()
		.describe("Номер зуба по формуле FDI, если пациент или врач его назвал"),
});

export type TranslatePatientComplaintInput = z.infer<typeof translatePatientComplaintSchema>;

export interface TranslatePatientComplaintResult {
	readonly originalText: string;
	readonly professionalMedicalTranslation: string;
	readonly suspectedNosologies: readonly {
		readonly codeMkb: string;
		readonly nameRu: string;
		readonly clinicalProbability: "high" | "moderate" | "low";
	}[];
	readonly recommendedDiagnosticTests: readonly string[];
}

export async function handleTranslatePatientComplaint(
	args: TranslatePatientComplaintInput,
	_context: DentalToolContext,
): Promise<TranslatePatientComplaintResult> {
	const text = args.complaintText.toLowerCase();
	const tooth = args.toothMentioned ? `в области зуба ${args.toothMentioned}` : "";

	const nosologies: {
		codeMkb: string;
		nameRu: string;
		clinicalProbability: "high" | "moderate" | "low";
	}[] = [];
	const diagnostics: string[] = ["Прицельная радиовизиография (RVG)"];
	let translation = `Пациент предъявляет жалобы на дискомфорт ${tooth}.`;

	if (/ночью|ноет|спать не могу|пульсир|приступ/i.test(text)) {
		translation = `Жалобы на самопроизвольные приступообразные боли ${tooth}, иррадиирующие по ходу ветвей тройничного нерва, с выраженным ночным обострением.`;
		nosologies.push({
			codeMkb: "K04.0",
			nameRu: "Острый пульпит (начальный / гнойный)",
			clinicalProbability: "high",
		});
		diagnostics.push("Электроодонтометрия (ЭОД)");
		diagnostics.push("Температурная проба (холодовой тест с этилхлоридом)");
	} else if (/накусыва|жева|вырос|стуч|дотронут|нажим/i.test(text)) {
		translation = `Жалобы на постоянную ноющую боль ${tooth}, резко усиливающуюся при механической нагрузке (накусывании), ощущение «выросшего зуба».`;
		nosologies.push({
			codeMkb: "K04.5",
			nameRu: "Хронический апикальный периодонтит в стадии обострения",
			clinicalProbability: "high",
		});
		diagnostics.push("Вертикальная и горизонтальная перкуссия");
		diagnostics.push("Пальпация переходной складки в проекции верхушки корня");
	} else if (/сладк|холодн|дырк|полость|застревает/i.test(text)) {
		translation = `Жалобы на кратковременный болевой синдром от сладкого, химических и термических раздражителей ${tooth}, быстро проходящий после устранения агента, задержку пищевых остатков.`;
		nosologies.push({
			codeMkb: "K02.1",
			nameRu: "Кариес дентина (средний / глубокий)",
			clinicalProbability: "high",
		});
		diagnostics.push("Зондирование дна и стенок кариозной полости");
		diagnostics.push("Холодовая проба (кратковременная реакция <5 сек)");
	} else if (/кров|десна|чистк|запах|шатает/i.test(text)) {
		translation = "Жалобы на кровоточивость десен при чистке зубов и приеме твердой пищи, неприятный запах изо рта, подвижность зубов.";
		nosologies.push({
			codeMkb: "K05.3",
			nameRu: "Хронический генерализованный пародонтит",
			clinicalProbability: "high",
		});
		diagnostics.push("Зондирование пародонтальных карманов в 6 точках (Perio-Chart)");
		diagnostics.push("Ортопантомография (ОПТГ) для оценки резорбции альвеолярной кости");
	} else if (/щелкает|хруст|рот не открывается|сустав/i.test(text)) {
		translation = "Жалобы на суставной шум (щелчки, крепитация) в височно-нижнечелюстном суставе при открывании рта, ограничение открывания рта, усталость жевательных мышц.";
		nosologies.push({
			codeMkb: "K07.6",
			nameRu: "Синдром дисфункции височно-нижнечелюстного сустава (ВНЧС)",
			clinicalProbability: "high",
		});
		diagnostics.push("Пальпация латеральных крыловидных и жевательных мышц");
		diagnostics.push("КЛКТ ВНЧС с открытым и закрытым ртом / МРТ сустава");
	}

	if (nosologies.length === 0) {
		nosologies.push({
			codeMkb: "K02.9",
			nameRu: "Кариес зубов неуточненный",
			clinicalProbability: "moderate",
		});
	}

	return {
		originalText: args.complaintText,
		professionalMedicalTranslation: translation,
		suspectedNosologies: nosologies,
		recommendedDiagnosticTests: diagnostics,
	};
}

export const translatePatientComplaintTool: DentalToolEntry<typeof translatePatientComplaintSchema> = {
	name: "translate_patient_complaint",
	description:
		"Перевод просторечных жалоб пациента ('ноет ночью', 'дырка', 'застревает пища', 'хрустит челюсть') в медицинские формулировки Формы 043/у и вероятные коды МКБ-10.",
	schema: translatePatientComplaintSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"translate_patient_complaint",
		"Клинический переводчик жалоб пациента в медицинские формулировки и МКБ-10.",
		translatePatientComplaintSchema,
	),
	handler: handleTranslatePatientComplaint,
};

// ============================================================================
// 7. TOOL: compare_dental_materials
// ============================================================================

export const compareDentalMaterialsSchema = z.object({
	comparisonCategory: z
		.enum([
			"bulk_fill_vs_layering",
			"gic_vs_sandwich",
			"bioceramics_vs_epoxy_sealer",
			"zirconia_vs_emax",
			"composite_vs_ceramic_inlay",
		])
		.describe("Категория сравниваемых стоматологических материалов и протоколов"),
	clinicalContext: z
		.string()
		.optional()
		.describe("Клиническая ситуация (например, 'полость II класса с поддесневым краем', 'дефект жевательного зуба 60%')"),
});

export type CompareDentalMaterialsInput = z.infer<typeof compareDentalMaterialsSchema>;

export interface CompareDentalMaterialsResult {
	readonly category: string;
	readonly materialA: string;
	readonly materialB: string;
	readonly clinicalVerdict: string;
	readonly comparisonTable: readonly {
		readonly criterion: string;
		readonly materialAVal: string;
		readonly materialBVal: string;
		readonly winner: "A" | "B" | "tie";
	}[];
	readonly keyRecommendation: string;
}

export async function handleCompareDentalMaterials(
	args: CompareDentalMaterialsInput,
	_context: DentalToolContext,
): Promise<CompareDentalMaterialsResult> {
	const cat = args.comparisonCategory;

	if (cat === "bulk_fill_vs_layering") {
		return {
			category: cat,
			materialA: "Bulk Fill композиты (SDR Plus, Filtek One Bulk Fill)",
			materialB: "Традиционная послойная реставрация (Estelite Asteria, Enamel Plus)",
			clinicalVerdict:
				"Bulk Fill превосходит в скорости и адаптации на дне глубоких полостей I и II классов (порции до 4 мм со сниженным C-фактором усадки), но уступает традиционным композитам в высокоэстетичной оптике фронтальной группы.",
			comparisonTable: [
				{
					criterion: "Толщина порции полимеризации",
					materialAVal: "До 4-5 мм за один цикл",
					materialBVal: "Строго до 2 мм",
					winner: "A",
				},
				{
					criterion: "Полимеризационный стресс / C-фактор",
					materialAVal: "Крайне низкий за счет мономеров релаксации",
					materialBVal: "Высокий (требует косой послойной укладки)",
					winner: "A",
				},
				{
					criterion: "Оптическая полихроматичность и эстетика",
					materialAVal: "Полупрозрачные, монохромные оттенки",
					materialBVal: "Высокая (дентин, опак, эмаль, транспарант)",
					winner: "B",
				},
				{
					criterion: "Скорость работы у кресла",
					materialAVal: "Быстро (сокращение времени на 40%)",
					materialBVal: "Длительно (микропослойное моделирование)",
					winner: "A",
				},
			],
			keyRecommendation:
				"Идеальный клинический симбиоз: основа полости II класса до окклюзионного уровня выполняется Bulk Fill материалом (SDR), а окклюзионный финишный слой (1.5 мм) — высоконаполненным пакуемым композитом.",
		};
	}

	if (cat === "bioceramics_vs_epoxy_sealer") {
		return {
			category: cat,
			materialA: "Биокерамические силеры на основе силикатов кальция (BioRoot RCS, TotalFill BC Sealer)",
			materialB: "Эпоксидно-аминовые силеры (AH Plus, Adseal)",
			clinicalVerdict:
				"Биокерамика обеспечивает непревзойденную биосовместимость, антибактериальную щелочную среду (pH > 12) и образование гидроксиапатита при взаимодействии с дентинной жидкостью, но затрудняет распломбировку при повторном эндолечении.",
			comparisonTable: [
				{
					criterion: "Биосовместимость и остеоиндукция",
					materialAVal: "Превосходная (активация цементобластов)",
					materialBVal: "Инертная, слабая цитотоксичность до полимеризации",
					winner: "A",
				},
				{
					criterion: "Усадка при затвердевании",
					materialAVal: "Отсутствует (слабое расширение 0.1%)",
					materialBVal: "Минимальная усадка (<1%)",
					winner: "A",
				},
				{
					criterion: "Возможность перелечивания (Retreatment)",
					materialAVal: "Сложная (твердость сопоставима с дентином)",
					materialBVal: "Хорошо растворяется сольвентами (эвкалиптол)",
					winner: "B",
				},
			],
			keyRecommendation:
				"Биокерамические силеры показаны при первичном эндолечении с широкими апексами, резорбциях и кистогранулемах. AH Plus остается золотым стандартом гибридной латеральной и вертикальной конденсации.",
		};
	}

	if (cat === "zirconia_vs_emax") {
		return {
			category: cat,
			materialA: "Диоксид циркония (Katana Multi-Layered / 3Y-5Y ZrO2)",
			materialB: "Дисиликат лития (IPS e.max CAD/Press)",
			clinicalVerdict:
				"e.max идеален для виниров и одиночных коронок фронтальной группы благодаря адгезивной фиксации к эмали; цирконий незаменим для жевательных коронок при бруксизме и протяженных мостовидных протезов.",
			comparisonTable: [
				{
					criterion: "Прочность на изгиб",
					materialAVal: "800–1200 МПа",
					materialBVal: "400–500 МПа",
					winner: "A",
				},
				{
					criterion: "Адгезивная фиксация (бондинг плавиковой кислотой)",
					materialAVal: "Не протравливается HF (требуется пескоструй MDP)",
					materialBVal: "Великолепный бондинг с силанизацией",
					winner: "B",
				},
				{
					criterion: "Оптическая прозрачность (Translucency)",
					materialAVal: "Хорошая у 5Y-циркония, но уступает стеклу",
					materialBVal: "Идентична естественной зубной эмали",
					winner: "B",
				},
			],
			keyRecommendation:
				"Фронтальная зона (13-23) и виниры — e.max; моляры, мосты и абатменты имплантатов — монолитный диоксид циркония.",
		};
	}

	return {
		category: cat,
		materialA: "Стеклоиономерный цемент (Fuji IX, Ketac Molar)",
		materialB: "Сэндвич-техника (СИЦ база + световой композит)",
		clinicalVerdict:
			"Чистый СИЦ уступает в истираемости и эстетике, но незаменим у детей и при высоком кариесогенном статусе. Сэндвич-техника объединяет фторидную защиту СИЦ с прочностью композита.",
		comparisonTable: [
			{
				criterion: "Выделение фтора и кариесостатичность",
				materialAVal: "Постоянное выделение фтора",
				materialBVal: "Выделение фтора в поддесневой зоне",
				winner: "tie",
			},
			{
				criterion: "Механическая прочность к истиранию",
				materialAVal: "Низкая",
				materialBVal: "Высокая",
				winner: "B",
			},
		],
		keyRecommendation:
			"При глубоких пришеечных полостях V класса и полостях II класса с выходом за эмалево-цементную границу применять открытую или закрытую сэндвич-технику.",
	};
}

export const compareDentalMaterialsTool: DentalToolEntry<typeof compareDentalMaterialsSchema> = {
	name: "compare_dental_materials",
	description:
		"Сравнительный доказательный анализ стоматологических материалов (Bulk Fill против послойного композита, биокерамические силеры против AH Plus, диоксид циркония против e.max, СИЦ).",
	schema: compareDentalMaterialsSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"compare_dental_materials",
		"Сравнительный анализ стоматологических материалов под клинический случай.",
		compareDentalMaterialsSchema,
	),
	handler: handleCompareDentalMaterials,
};
