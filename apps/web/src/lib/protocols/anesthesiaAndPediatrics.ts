import type { AnesthesiaSafetyLevel } from "@dental/shared";
import type {
	DiaryState,
	OdontogramFindingInput,
	ClinicalProtocolSoap,
} from "./protocolTypes.js";
import { getToothAnatomicalNameRu } from "./fdiAnatomy.js";
import {
	ANESTHESIA_DRUGS,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaDrugKey,
	type SomaticRiskProfile,
} from "../../components/visit/anesthesiaCalculatorEngine.js";

/** Пресет быстрого протоколирования анестезии */
export interface AnesthesiaQuickPreset {
	readonly id: string;
	readonly drugKey?: AnesthesiaDrugKey;
	readonly label: string;
	readonly subLabel: string;
	readonly volume: string;
	readonly textToInsert: string;
	readonly isAdrenalineFree?: boolean;
	readonly containsSulfites?: boolean;
	readonly cardioSafe?: boolean;
	readonly pregnancyPreferred?: boolean;
}

/** 5 основных анестетиков в стоматологической практике */
export const ANESTHESIA_QUICK_PRESETS: readonly AnesthesiaQuickPreset[] = [
	{
		id: "ultracain_ds",
		drugKey: "ultracain_ds",
		label: "Ультракаин Д-С",
		subLabel: "1.7 мл · 1:200 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С (Артикаин 4% с эпинефрином 1:200 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: true,
	},
	{
		id: "ultracain_ds_forte",
		drugKey: "ultracain_ds_forte",
		label: "Ультракаин Д-С Форте",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Ультракаин Д-С Форте (Артикаин 4% с эпинефрином 1:100 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: false,
	},
	{
		id: "septanest",
		drugKey: "septanest_100",
		label: "Септанест",
		subLabel: "1.7 мл · 1:100 000",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Септанест (Артикаин 4% с адреналином 1:100 000) 1.7 мл.",
		isAdrenalineFree: false,
		containsSulfites: true,
		cardioSafe: false,
		pregnancyPreferred: false,
	},
	{
		id: "scandonest",
		drugKey: "scandonest_3",
		label: "Скандонест 3%",
		subLabel: "1.7 мл · без адреналина",
		volume: "1.7 мл",
		textToInsert:
			"Анестезия: Скандонест 3% (Мепивакаин 3% без адреналина/вазоконстриктора) 1.7 мл.",
		isAdrenalineFree: true,
		containsSulfites: false,
		cardioSafe: true,
		pregnancyPreferred: false,
	},
	{
		id: "lidocaine",
		drugKey: "lidocaine_2",
		label: "Лидокаин 2%",
		subLabel: "2.0 мл",
		volume: "2.0 мл",
		textToInsert: "Анестезия: Лидокаин 2% 2.0 мл.",
		isAdrenalineFree: true,
		containsSulfites: false,
		cardioSafe: true,
		pregnancyPreferred: false,
	},
];

/**
 * Парсит соматический анамнез пациента в структурированный профиль риска.
 */
export function extractSomaticRiskProfileFromText(text?: string | null): SomaticRiskProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) return {};

	const hasCardio =
		raw.includes("гипертон") ||
		raw.includes("ибс") ||
		raw.includes("аритми") ||
		raw.includes("давлен") ||
		raw.includes("сердеч") ||
		raw.includes("i10") ||
		raw.includes("i11") ||
		raw.includes("i15") ||
		raw.includes("стенокард") ||
		raw.includes("инфаркт");

	const hasSulfite =
		raw.includes("сульфит") ||
		raw.includes("дисульфит") ||
		raw.includes("метабисульфит");

	const hasAsthma =
		raw.includes("астм") ||
		raw.includes("бронхиальн") ||
		raw.includes("j45");

	const isPregnant =
		raw.includes("беременн") ||
		raw.includes("лактац") ||
		raw.includes("кормлен") ||
		raw.includes("гв") ||
		raw.includes("триместр");

	return {
		hasCardiovascularRisk: hasCardio,
		hasSulfiteAllergy: hasSulfite,
		hasBronchialAsthma: hasAsthma,
		isPregnantOrLactating: isPregnant,
		...(text ? { customNotes: text } : {}),
	};
}

/**
 * Проверяет совместимость анестетика с соматическим статусом из дневника.
 */
export function checkSomaticAnesthesiaCompatibility(
	comorbiditiesText: string | undefined,
	drugKey: AnesthesiaDrugKey = "ultracain_ds",
) {
	const profile = extractSomaticRiskProfileFromText(comorbiditiesText);
	return checkAnesthesiaSomaticContraindications({
		drugKey,
		somaticProfile: profile,
	});
}

/**
 * ⚠️ ТАБУ СОЗДАТЕЛЯ: СТРОГО НЕ ТРОГАТЬ ПЕДИАТРИЮ!
 * Автоматический расчет предельно допустимой дозы анестетика
 * (Артикаин 4% — макс. 5 мг/кг / 0.125 мл/кг) при указании массы тела ребенка (кг).
 */
export function calculatePediatricAnesthesiaLimit(
	weightKg: number,
	drugKey: AnesthesiaDrugKey = "ultracain_ds",
): {
	weightKg: number;
	maxDoseMgPerKg: number;
	maxSafeDoseMg: number;
	maxSafeVolumeMl: number;
	maxSafeCarpules: number;
	formattedSafetyNote: string;
} {
	const weight = Math.max(
		5,
		Math.min(
			100,
			Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 20,
		),
	);
	const drug = ANESTHESIA_DRUGS[drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const maxDoseMgPerKg = drug.maxDoseMgPerKgPediatric ?? 5.0; // 5.0 мг/кг для Артикаина
	const maxSafeDoseMg = Math.round(weight * maxDoseMgPerKg * 10) / 10;
	// 4% раствор = 40 мг/мл -> 5 мг/кг / 40 мг/мл = 0.125 мл/кг
	const mgPerMl = drug.concentrationPct * 10; // 40 мг/мл для 4%
	const maxSafeVolumeMl =
		Math.round((maxSafeDoseMg / mgPerMl) * 100) / 100;
	const maxSafeCarpules =
		Math.round((maxSafeVolumeMl / drug.volumeMlPerCarpule) * 10) / 10;

	const formattedSafetyNote = `Расчет дозы анестетика по массе тела ребенка (${weight} кг):\n• Препарат: ${drug.commercialName} (${drug.activeSubstance})\n• Предельная педиатрическая доза: ${maxDoseMgPerKg} мг/кг (макс. ${maxSafeDoseMg} мг)\n• Предельный объем: ${maxSafeVolumeMl} мл (макс. ${maxSafeCarpules} карпулы по ${drug.volumeMlPerCarpule} мл)`;

	return {
		weightKg: weight,
		maxDoseMgPerKg,
		maxSafeDoseMg,
		maxSafeVolumeMl,
		maxSafeCarpules,
		formattedSafetyNote,
	};
}

/**
 * Добавление анестетика в поле лечения P (с дедупликацией)
 */
export function appendAnesthesiaToSoap(
	current: DiaryState,
	anestheticText: string,
): DiaryState {
	const curTreatment = (current.treatmentDescription ?? "").trim();
	if (!curTreatment) {
		return {
			...current,
			treatmentDescription: anestheticText,
		};
	}
	if (curTreatment.includes(anestheticText)) {
		return current;
	}
	return {
		...current,
		treatmentDescription: `${anestheticText}\n${curTreatment}`,
	};
}

/** 1-клик пресеты карпульной анестезии для клинического дневника 043/у */
export interface CarpuleAnesthesiaPreset {
	readonly key: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly text: string;
	readonly hasAdrenaline: boolean;
	readonly adrenalineRatio: "1:100000" | "1:200000" | "none";
}

/** Канонический 1-клик протокол анестезии нормы */
export const STANDARD_ANESTHESIA_NORM_PRESET_RU =
	"Артикаин 4% с эпинефрином 1:100 000, 1.7 мл, инфильтрационная/проводниковая, аспирационная проба отрицательная, аллергических реакций нет.";

export const STANDARD_ANESTHESIA_NORM_FULL_043 =
	"Проведена местная инфильтрационная/проводниковая анестезия: Артикаин 4% с эпинефрином 1:100 000, 1.7 мл (1 карпула). Аспирационная проба отрицательная (кровь в карпуле отсутствует). Обезболивание глубокое, наступило по клиническим признакам, аллергических реакций нет.";

export const CARPULE_ANESTHESIA_PRESETS: readonly CarpuleAnesthesiaPreset[] = [
	{
		key: "articaine_100k",
		title: "Артикаин 4% + Адреналин 1:100 000 (Норма в 1 клик)",
		shortLabel: "Артикаин 1:100k (Норма)",
		description: "Стандарт норма: аспирация (-), аллергий нет",
		text: "Инфильтрационная/проводниковая анестезия: Артикаин 4% с эпинефрином 1:100 000, 1.7 мл. Аспирационная проба отрицательная, аллергических реакций нет. Обезболивание глубокое, наступило по клиническим признакам.",
		hasAdrenaline: true,
		adrenalineRatio: "1:100000",
	},
	{
		key: "articaine_200k",
		title: "Артикаин 4% + Адреналин 1:200 000",
		shortLabel: "Артикаин 1:200k",
		description: "Сосудистый щадящий режим",
		text: "Анестезия инфильтрационная/проводниковая (Артикаин 4% с адреналином 1:200 000, 1.7 мл). Щадящий кардиоваскулярный режим. Обезболивание наступило через 3 минуты.",
		hasAdrenaline: true,
		adrenalineRatio: "1:200000",
	},
	{
		key: "scandonest_mepivacaine_3",
		title: "Мепивакаин (Скандонест) 3% без вазоконстриктора",
		shortLabel: "Скандонест 3% (без адреналина)",
		description: "Для гипертоников, ССЗ, глаукомы, аллергии на сульфиты, беременных",
		text: "Анестезия инфильтрационная/проводниковая (Мепивакаин 3% без вазоконстриктора, 1.7 мл). Препарат выбора при сопутствующей кардиоваскулярной патологии и гипертонии. Обезболивание адекватное.",
		hasAdrenaline: false,
		adrenalineRatio: "none",
	},
];

export interface AnesthesiaRiskEvaluation {
	readonly hasHypertensionRisk: boolean;
	readonly detectedAnestheticWithAdrenaline: boolean;
	readonly isWarningTriggered: boolean;
	readonly warningMessage?: string | undefined;
}

/** Автоматическая оценка кардиоваскулярных рисков при выборе анестетика */
export function evaluateAnesthesiaRisk(
	anamnesisText?: string,
	treatmentPlanText?: string,
	patientMedicalAlerts?: readonly string[] | string,
): AnesthesiaRiskEvaluation {
	const textToSearch = [
		anamnesisText || "",
		Array.isArray(patientMedicalAlerts) ? patientMedicalAlerts.join(" ") : (patientMedicalAlerts || ""),
	].join(" ").toLowerCase();

	const HYPERTENSION_PATTERNS = [
		/гипертон/i,
		/гипертенз/i,
		/i10/i,
		/i11/i,
		/i15/i,
		/высокое\s*давлен/i,
		/ад\s*(?:>|>=|выше|140|150|160|170|180)/i,
		/артериальн.*давлен/i,
		/ибс/i,
		/стенокард/i,
		/кардио/i,
		/инфаркт/i,
		/инсульт/i,
		/аритми/i,
	];

	const hasHypertensionRisk = HYPERTENSION_PATTERNS.some((p) => p.test(textToSearch));

	const treatmentLower = (treatmentPlanText || "").toLowerCase();
	const ADRENALINE_PATTERNS = [
		/1:100\s*000/i,
		/1:200\s*000/i,
		/1:100k/i,
		/1:200k/i,
		/адреналин/i,
		/эпинефрин/i,
		/форте/i,
		/септанест/i,
		/ультракаин\s*д-с/i,
	];

	const detectedAnestheticWithAdrenaline = ADRENALINE_PATTERNS.some((p) => p.test(treatmentLower));
	const isWarningTriggered = hasHypertensionRisk && detectedAnestheticWithAdrenaline;

	const warningMessage = isWarningTriggered
		? "Внимание: У пациента в анамнезе зафиксирована гипертония / риск ССЗ. Применение анестетика с адреналином требует осторожности (макс. 0.04 мг адреналина / 2 карпулы). Рекомендуется Мепивакаин (Скандонест) 3% без вазоконстриктора."
		: undefined;

	return {
		hasHypertensionRisk,
		detectedAnestheticWithAdrenaline,
		isWarningTriggered,
		warningMessage,
	};
}

/** Результат расчета карпульной анестезии и дозировок по массе тела */
export interface AnesthesiaCarpuleCalculation {
	readonly drugKey: AnesthesiaDrugKey;
	readonly drugName: string;
	readonly activeSubstance: string;
	readonly carpulesCount: number;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly volumeMl: number;
	readonly activeDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly epinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyPercentage: number;
	readonly isOverdose: boolean;
	readonly isCardioRestricted: boolean;
	readonly safetyLevel: AnesthesiaSafetyLevel;
	readonly warningMessage?: string | undefined;
	readonly formattedSafetyNote: string;
	readonly formattedTreatmentSnippet: string;
}

/** Автоматический расчет предельной безопасной дозы анестетика по весу пациента и числу карпул */
export function calculateAnesthesiaCarpulesSafety(params: {
	readonly drugKey?: string | undefined;
	readonly carpulesCount?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly methodNameRu?: string | undefined;
}): AnesthesiaCarpuleCalculation {
	const rawKey = params.drugKey || "ultracain_ds";
	const drugKey = (
		rawKey === "articaine_100k"
			? "ultracain_ds_forte"
			: rawKey === "articaine_200k"
				? "ultracain_ds"
				: rawKey === "scandonest_mepivacaine_3"
					? "scandonest_3"
					: rawKey in ANESTHESIA_DRUGS
						? rawKey
						: "ultracain_ds"
	) as AnesthesiaDrugKey;

	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const weight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		isPediatric,
	);
	const carpules = Math.max(
		0.25,
		Number.isFinite(params.carpulesCount) && (params.carpulesCount ?? 0) > 0
			? (params.carpulesCount ?? 1)
			: 1,
	);

	const safety = calculateAnesthesiaSafety({
		drugKey,
		patientWeightKg: weight,
		carpulesCount: carpules,
		patientAgeYears: params.patientAgeYears,
		isPediatric,
		somaticProfile: params.somaticProfile,
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const method = params.methodNameRu || "Инфильтрационная/проводниковая";
	const formattedTreatmentSnippet = `Анестезия: ${method}${toothSuffix} — ${safety.drug.commercialName} (${safety.drug.activeSubstance}) ${carpules} карп. (${safety.totalVolumeMl} мл, ${safety.totalDoseMg} мг). Обезболивание глубокое, наступило через 2–3 мин.`;

	const formattedSafetyNote =
		safety.safetyLevel === "REQUIRES_WEIGHT_INPUT"
			? (safety.warningMessage || "Укажите фактический вес пациента для расчета анестезии!")
			: `Расчет дозировки: ${safety.drug.commercialName} • Введено: ${carpules} карп. (${safety.totalVolumeMl} мл / ${safety.totalDoseMg} мг) • Предел по весу ${weight} кг: макс. ${safety.maxSafeCarpules} карп. (${safety.maxSafeDoseMg} мг) • ${safety.safetyPercentage}% от предела безопасности.`;

	return {
		drugKey: safety.drug.key,
		drugName: safety.drug.commercialName,
		activeSubstance: safety.drug.activeSubstance,
		carpulesCount: carpules,
		patientWeightKg: weight,
		isPediatric: safety.isPediatric,
		volumeMl: safety.totalVolumeMl,
		activeDoseMg: safety.totalDoseMg,
		maxSafeDoseMg: safety.maxSafeDoseMg,
		maxSafeCarpules: safety.maxSafeCarpules,
		epinephrineMg: safety.totalEpinephrineMg,
		maxSafeEpinephrineMg: safety.maxSafeEpinephrineMg,
		safetyPercentage: safety.safetyPercentage,
		isOverdose: safety.safetyRatio >= 1.0,
		isCardioRestricted: safety.isCardioRestricted,
		safetyLevel: safety.safetyLevel,
		warningMessage: safety.warningMessage ?? undefined,
		formattedSafetyNote,
		formattedTreatmentSnippet,
	};
}

/**
 * ⚠️ ТАБУ СОЗДАТЕЛЯ: СТРОГО НЕ ТРОГАТЬ ПЕДИАТРИЮ (молочные зубы)!
 * Удаление временного зуба / физиологическая смена (K00.6 / зубы 51–85)
 */
export function generatePediatricSoap(
	finding: OdontogramFindingInput,
): ClinicalProtocolSoap | null {
	const tooth = finding.toothNumber;
	const isPrimary = tooth >= 51 && tooth <= 85;
	if (!isPrimary) return null;

	const stateNorm = (finding.state || "").toLowerCase();
	if (
		stateNorm === "extraction" ||
		stateNorm === "to_extract" ||
		stateNorm === "missing" ||
		stateNorm === "exfoliation" ||
		stateNorm === "resorption" ||
		stateNorm.startsWith("k00.6")
	) {
		const toothTitle = getToothAnatomicalNameRu(tooth);
		const icd = finding.icd10Override || "K00.6";
		const icdLabel = "Нарушения прорезывания зубов (физиологическая смена временного зуба)";
		const anamnesis = `Жалобы на подвижность временного зуба ${toothTitle}, дискомфорт при приеме твердой пищи, физиологическая смена зуба.`;
		const statusLocalis = `Зуб ${toothTitle}: Временный зуб. Физиологическая резорбция корней III степени (сохранена только коронковая часть). Подвижность зуба II-III степени. Слизистая оболочка бледно-розовая, без воспаления. Зачаток постоянного зуба в фазе прорезывания.`;
		const treatmentDescription = `Аппликационная анестезия десны (местная анестезия амидного ряда). Бережная люксация и удаление подвижной коронки временного зуба ${tooth} детскими анатомическими щипцами. Ревизия лунки. Гемостаз марлевым шариком (2-3 мин). Устойчивый кровяной сгусток. Выданы рекомендации родителям и ребенку.`;
		return {
			toothNumber: tooth,
			toothNameRu: toothTitle,
			diagnosisIcd10: icd,
			diagnosisIcd10Label: icdLabel,
			diagnosisTooth: String(tooth),
			anamnesis,
			statusLocalis,
			treatmentDescription,
			recommendations:
				"Не пить и не принимать пищу 1.5–2 часа. Не полоскать рот активно (сохранять сгусток). Щадящая диета 1-2 дня. Медаль/подарок за смелость.",
		};
	}

	return null;
}
