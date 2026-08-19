import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 043-1/у — МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА
 * Приказ Минздрава РФ / Стандарты оказания ортодонтической помощи
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Тип лица по антропометрии */
export const facialMorphologicalTypeSchema = z.enum([
	"leptoprosopic", // Лептопрозоп (узкое / длинное лицо)
	"mesoprosopic", // Мезопрозоп (среднее / пропорциональное лицо)
	"euryprosopic", // Эурипрозоп (широкое / низкое лицо)
]);
export type FacialMorphologicalType = z.infer<typeof facialMorphologicalTypeSchema>;

export const facialMorphologicalTypeLabels: Record<FacialMorphologicalType, string> = {
	leptoprosopic: "Лептопрозоп (долихофациальный / узкий тип лица)",
	mesoprosopic: "Мезопрозоп (мезофациальный / гармоничный тип лица)",
	euryprosopic: "Эурипрозоп (брахифациальный / широкий тип лица)",
};

/** Профиль лица */
export const facialProfileTypeSchema = z.enum([
	"straight", // Прямой
	"convex", // Выпуклый (прогнатия в/ч или ретрогнатия н/ч, сагиттальный II класс)
	"concave", // Вогнутый (прогнатия н/ч или ретрогнатия в/ч, сагиттальный III класс)
]);
export type FacialProfileType = z.infer<typeof facialProfileTypeSchema>;

/** Антропометрия и фотометрия лица */
export const facialAnthropometrySchema = z.object({
	facialType: facialMorphologicalTypeSchema.default("mesoprosopic"),
	profileType: facialProfileTypeSchema.default("straight"),
	facialSymmetry: z.enum(["symmetric", "chin_deviation_left", "chin_deviation_right"]).default("symmetric"),
	chinDeviationMm: z.number().min(0).max(30).default(0),
	nasolabialAngleDegrees: z.number().min(50).max(150).default(102), // Норма 90-110°
	mentolabialSulcus: z.enum(["normal", "deep_pronounced", "smoothed"]).default("normal"),
	lipCompetenceAtRest: z.enum(["competent_closed", "incompetent_open", "closed_with_strain"]).default("competent_closed"),
	incisalDisplayAtSmileMm: z.number().min(-5).max(15).default(3), // Экспозиция резцов при улыбке (норма 2-4 мм)
	gummySmileMm: z.number().min(0).max(15).default(0), // Десневая улыбка (>2 мм)
	photoProtocolCompleted: z.boolean().default(true), // Фотометрия (анфас, улыбка, профиль 90°, 45°, внутриротовые)
});
export type FacialAnthropometry = z.infer<typeof facialAnthropometrySchema>;

/** Цефалометрия ТРГ (Телерентгенография черепа в боковой проекции) */
export const cephalometricTrgAnalysisSchema = z.object({
	snaAngle: z.number().min(60).max(110).default(82), // Норма 82° ± 2° (положение верхней челюсти)
	snbAngle: z.number().min(60).max(110).default(80), // Норма 80° ± 2° (положение нижней челюсти)
	anbAngle: z.number().min(-15).max(25).default(2), // Норма 2° ± 1° (сагиттальная межчелюстная разница)
	witsAppraisalMm: z.number().min(-20).max(20).default(0), // Число Витса (норма -1..0 мм)
	fmaAngle: z.number().min(10).max(50).default(25), // Плоскость нижней челюсти к Франкфурту (25° ± 3°)
	snGoGnAngle: z.number().min(15).max(60).default(32), // Норма 32° ± 3° (вертикальный тип роста)
	upperIncisorToNaAngle: z.number().min(5).max(50).default(22), // 1-NA наклон верхних резцов (22°)
	upperIncisorToNaMm: z.number().min(-10).max(20).default(4), // 1-NA положение верхних резцов (4 мм)
	lowerIncisorToNbAngle: z.number().min(5).max(50).default(25), // 1-NB наклон нижних резцов (25°)
	lowerIncisorToNbMm: z.number().min(-10).max(20).default(4), // 1-NB положение нижних резцов (4 мм)
	interincisalAngle: z.number().min(90).max(170).default(130), // Межрезцовый угол (130° ± 5°)
	growthPattern: z.enum(["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]).default("normodivergent"),
	skeletalClass: z.enum(["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]).default("class_1"),
});
export type CephalometricTrgAnalysis = z.infer<typeof cephalometricTrgAnalysisSchema>;

/** Расчет индекса Тона (Tonn index) */
export interface TonnIndexResult {
	sumUpperIncisorsMm: number; // SI = 11 + 12 + 21 + 22
	sumLowerIncisorsMm: number; // Si = 31 + 32 + 41 + 42
	tonnRatio: number; // SI / Si
	isDeciduous: boolean;
	normRatio: number; // 1.33 для постоянных, 1.30 для временных
	deviationInterpretation: string;
}

export function calculateTonnIndex(
	upperIncisorWidths: [number, number, number, number], // 12, 11, 21, 22
	lowerIncisorWidths: [number, number, number, number], // 42, 41, 31, 32
	isDeciduous = false,
): TonnIndexResult {
	const sumUpper = upperIncisorWidths.reduce((a, b) => a + b, 0);
	const sumLower = lowerIncisorWidths.reduce((a, b) => a + b, 0);
	const ratio = sumLower > 0 ? Number((sumUpper / sumLower).toFixed(2)) : 0;
	const norm = isDeciduous ? 1.30 : 1.33;

	let interpretation = "Пропорциональное соотношение размеров коронок верхних и нижних резцов (норма).";
	if (ratio > norm + 0.05) {
		interpretation = `Относительная макродентия верхних резцов или микродентия нижних (индекс ${ratio} > нормы ${norm}).`;
	} else if (ratio < norm - 0.05) {
		interpretation = `Относительная макродентия нижних резцов или микродентия верхних (индекс ${ratio} < нормы ${norm}).`;
	}

	return {
		sumUpperIncisorsMm: Number(sumUpper.toFixed(1)),
		sumLowerIncisorsMm: Number(sumLower.toFixed(1)),
		tonnRatio: ratio,
		isDeciduous,
		normRatio: norm,
		deviationInterpretation: interpretation,
	};
}

/** Расчет индекса Пона (Pont index) */
export interface PontIndexResult {
	sumUpperIncisorsMm: number; // SI
	calculatedPremolarWidthMm: number; // SI * 100 / 80
	calculatedMolarWidthMm: number; // SI * 100 / 64
	measuredPremolarWidthMm: number;
	measuredMolarWidthMm: number;
	premolarDiscrepancyMm: number; // measured - calculated (отрицательный = сужение)
	molarDiscrepancyMm: number;
	interpretation: string;
}

export function calculatePontIndex(
	sumUpperIncisorsMm: number,
	measuredPremolarWidthMm: number,
	measuredMolarWidthMm: number,
): PontIndexResult {
	const calcPremolar = Number(((sumUpperIncisorsMm * 100) / 80).toFixed(1));
	const calcMolar = Number(((sumUpperIncisorsMm * 100) / 64).toFixed(1));

	const diffP = Number((measuredPremolarWidthMm - calcPremolar).toFixed(1));
	const diffM = Number((measuredMolarWidthMm - calcMolar).toFixed(1));

	const pDesc =
		diffP < -1 ? `сужение в области премоляров на ${Math.abs(diffP)} мм` : diffP > 1 ? `расширение в премолярах на ${diffP} мм` : "норма в премолярах";
	const mDesc =
		diffM < -1 ? `сужение в области моляров на ${Math.abs(diffM)} мм` : diffM > 1 ? `расширение в молярах на ${diffM} мм` : "норма в молярах";

	return {
		sumUpperIncisorsMm: Number(sumUpperIncisorsMm.toFixed(1)),
		calculatedPremolarWidthMm: calcPremolar,
		calculatedMolarWidthMm: calcMolar,
		measuredPremolarWidthMm: Number(measuredPremolarWidthMm.toFixed(1)),
		measuredMolarWidthMm: Number(measuredMolarWidthMm.toFixed(1)),
		premolarDiscrepancyMm: diffP,
		molarDiscrepancyMm: diffM,
		interpretation: `Индекс Пона: ${pDesc}, ${mDesc}.`,
	};
}

/** Расчет индекса Болтона (Bolton index) */
export interface BoltonIndexResult {
	sumUpper6Mm: number; // 13-23
	sumLower6Mm: number; // 33-43
	anteriorRatio: number; // (sumLower6 / sumUpper6) * 100% (норма 77.2%)
	anteriorDiscrepancyInterpretation: string;
	sumUpper12Mm: number; // 16-26
	sumLower12Mm: number; // 36-46
	overallRatio: number; // (sumLower12 / sumUpper12) * 100% (норма 91.3%)
	overallDiscrepancyInterpretation: string;
}

export function calculateBoltonIndex(
	upper12Widths: number[], // 16..26 (12 зубов)
	lower12Widths: number[], // 46..36 (12 зубов)
): BoltonIndexResult {
	// 6 передних зубов (индексы 3..8: 13, 12, 11, 21, 22, 23 и 43, 42, 41, 31, 32, 33)
	const upper6 = upper12Widths.slice(3, 9).reduce((a, b) => a + b, 0);
	const lower6 = lower12Widths.slice(3, 9).reduce((a, b) => a + b, 0);

	const upper12 = upper12Widths.reduce((a, b) => a + b, 0);
	const lower12 = lower12Widths.reduce((a, b) => a + b, 0);

	const antRatio = upper6 > 0 ? Number(((lower6 / upper6) * 100).toFixed(1)) : 0;
	const overRatio = upper12 > 0 ? Number(((lower12 / upper12) * 100).toFixed(1)) : 0;

	let antDesc = "Переднее соотношение Болтона гармонично (норма 77.2% ± 1.6%).";
	if (antRatio > 78.8) {
		const excessLower = Number((lower6 - (upper6 * 77.2) / 100).toFixed(1));
		antDesc = `Избыток ткани нижних резцов/клыков: ${antRatio}% (избыток ~${excessLower} мм).`;
	} else if (antRatio < 75.6) {
		const excessUpper = Number((upper6 - (lower6 * 100) / 77.2).toFixed(1));
		antDesc = `Избыток ткани верхних резцов/клыков: ${antRatio}% (избыток ~${excessUpper} мм).`;
	}

	let overDesc = "Полное соотношение Болтона гармонично (норма 91.3% ± 1.9%).";
	if (overRatio > 93.2) {
		overDesc = `Избыток нижнего зубного ряда: ${overRatio}% (> нормы 91.3%).`;
	} else if (overRatio < 89.4) {
		overDesc = `Избыток верхнего зубного ряда: ${overRatio}% (< нормы 91.3%).`;
	}

	return {
		sumUpper6Mm: Number(upper6.toFixed(1)),
		sumLower6Mm: Number(lower6.toFixed(1)),
		anteriorRatio: antRatio,
		anteriorDiscrepancyInterpretation: antDesc,
		sumUpper12Mm: Number(upper12.toFixed(1)),
		sumLower12Mm: Number(lower12.toFixed(1)),
		overallRatio: overRatio,
		overallDiscrepancyInterpretation: overDesc,
	};
}

/** План ортодонтического аппаратурного лечения */
export const orthodonticAppliancePlanSchema = z.object({
	applianceType: z.enum([
		"metal_braces_standard", // Металлическая лигатурная брекет-система
		"metal_braces_self_ligating", // Металлическая самолигирующая (Damon Q2 / SmartClip)
		"ceramic_braces_aesthetic", // Эстетическая керамическая / сапфировая брекет-система
		"lingual_braces", // Лингвальная брекет-система (Incognito / WIN)
		"clear_aligners", // Элайнеры прозрачные (серия кап с аттачментами)
		"rapid_palatal_expander_haas", // Аппарат Хааса / Марко Роса (несъемный нёбный расширитель)
		"functional_twin_block", // Функциональный двучелюстной аппарат Твин-Блок
		"plate_removable_orthodontic", // Пластиночный съемный аппарат с винтом Бертони
		"skeletal_anchorage_miniscrews", // Микроимпланты / скелетный анкораж
	]).default("metal_braces_self_ligating"),
	alignerStepsCount: z.number().int().min(0).max(120).default(0),
	extractionPlan: z.enum(["non_extraction", "premolars_extraction", "wisdom_teeth_extraction", "asymmetric_extraction"]).default("non_extraction"),
	treatmentStages: z.array(z.string().trim().min(1).max(500)).default([
		"1. Подготовительный этап: санация полости рта, профессиональная гигиена, удаление ретинированных третьих моляров",
		"2. Этап нивелирования и выравнивания зубных рядов (круглые NiTi дуги .014, .018)",
		"3. Этап закрытия промежутков и коррекции сагиттального соотношения (прямоугольные дуги SS .019x.025, эластики II класса)",
		"4. Юстировка и финишная детализация окклюзионных контактов (дуги TMA .019x.025, коробочные эластики)",
		"5. Ретенционный период: несъемные ретейнеры 33-43, 13-23 + прозрачные ночные капы",
	]),
	estimatedDurationMonths: z.number().int().min(1).max(48).default(18),
	retentionProtocol: z.string().trim().max(1000).default("Несъемный проволочный ретейнер на фронтальные зубы в/ч и н/ч пожизненно/на срок не менее 5 лет + ретенционная каппа на ночь 12 месяцев"),
});
export type OrthodonticAppliancePlan = z.infer<typeof orthodonticAppliancePlanSchema>;

/** Полный структурированный Payload формы № 043-1/у */
export const orthodonticCard043_1uPayloadSchema = z.object({
	formNumber: z.literal("043-1/у"),
	// Реквизиты медорганизации
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	clinicLicenseNumber: z.string().trim().max(64).nullable().optional(),
	clinicLicenseDate: z.string().trim().max(32).nullable().optional(),
	clinicLicenseIssuer: z.string().trim().max(240).nullable().optional(),
	// Данные пациента
	medicalCardNumber: z.string().trim().min(1).max(64),
	cardOpenedDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientSex: z.enum(["male", "female"]).default("male"),
	patientPhone: z.string().trim().max(64).nullable().optional(),
	patientAddress: z.string().trim().max(240).nullable().optional(),
	legalRepresentativeFullName: z.string().trim().max(160).nullable().optional(),
	// Врач-ортодонт
	orthodontistFullName: z.string().trim().min(1).max(160),
	// Клинический диагноз
	orthodonticDiagnosis: z.string().trim().min(1).max(2000),
	icd10DiagnosisCode: z.string().trim().max(32).default("K07.2"),
	angleMolarClassRight: z.enum(["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]).default("class_1"),
	angleMolarClassLeft: z.enum(["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]).default("class_1"),
	angleCanineClassRight: z.enum(["class_1", "class_2", "class_3"]).default("class_1"),
	angleCanineClassLeft: z.enum(["class_1", "class_2", "class_3"]).default("class_1"),
	// Антропометрия и фотометрия лица
	anthropometry: facialAnthropometrySchema.default({
		facialType: "mesoprosopic",
		profileType: "straight",
		facialSymmetry: "symmetric",
		chinDeviationMm: 0,
		nasolabialAngleDegrees: 102,
		mentolabialSulcus: "normal",
		lipCompetenceAtRest: "competent_closed",
		incisalDisplayAtSmileMm: 3,
		gummySmileMm: 0,
		photoProtocolCompleted: true,
	}),
	// Цефалометрия ТРГ
	cephalometry: cephalometricTrgAnalysisSchema.default({
		snaAngle: 82,
		snbAngle: 80,
		anbAngle: 2,
		witsAppraisalMm: 0,
		fmaAngle: 25,
		snGoGnAngle: 32,
		upperIncisorToNaAngle: 22,
		upperIncisorToNaMm: 4,
		lowerIncisorToNbAngle: 25,
		lowerIncisorToNbMm: 4,
		interincisalAngle: 130,
		growthPattern: "normodivergent",
		skeletalClass: "class_1",
	}),
	// Расчет ортодонтических индексов
	tonnIndexNotes: z.string().trim().max(1000).default("Индекс Тона SI/Si = 1.33 — гармоничная пропорция ширины резцов."),
	pontIndexNotes: z.string().trim().max(1000).default("Индекс Пона: симметричная форма зубных дуг, сужения зубного ряда не выявлено."),
	boltonIndexNotes: z.string().trim().max(1000).default("Индекс Болтона: переднее соотношение 77.2%, общее 91.3% (норма, избытка/дефицита зубов нет)."),
	korkhausIndexNotes: z.string().trim().max(1000).default("Индекс Коркхауза: длина переднего отрезка верхней зубной дуги соответствует норме."),
	// План аппаратурного лечения
	appliancePlan: orthodonticAppliancePlanSchema.default({
		applianceType: "metal_braces_self_ligating",
		alignerStepsCount: 0,
		extractionPlan: "non_extraction",
		treatmentStages: [
			"1. Подготовительный этап: санация полости рта, профессиональная гигиена",
			"2. Этап нивелирования и выравнивания зубных рядов",
			"3. Этап коррекции сагиттального и трансверзального соотношения",
			"4. Финишная детализация окклюзионных контактов",
			"5. Ретенционный период: несъемные ретейнеры + капы",
		],
		estimatedDurationMonths: 18,
		retentionProtocol: "Несъемный ретейнер 33-43, 13-23 + ретенционная капа",
	}),
});
export type OrthodonticCard043_1uPayload = z.infer<typeof orthodonticCard043_1uPayloadSchema>;
