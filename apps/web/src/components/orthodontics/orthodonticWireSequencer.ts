/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORTHODONTIC WIRE SEQUENCER & TORQUE EXPRESSION MATHEMATICAL ENGINE
 * (Движок протокола смены ортодонтических дуг и физики экспрессии торка)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements the standard 4-stage archwire progression:
 * 1. Leveling & Alignment (Нивелирование и деротация: круглые NiTi / Cu-NiTi)
 * 2. Working & Space Closure (Рабочий этап: прямоугольные SS / Cu-NiTi / T-Loop)
 * 3. Finishing & Detailing (Финишная юстировка: TMA / Beta-Ti / Braided)
 * 4. Retention (Ретенционный период: несъемные ретейнеры + Essix каппы)
 *
 * Includes mathematical calculations for:
 * - Torsional play (люфт дуги в пазе брекета в градусах)
 * - Nominal vs Effective torque transmission percentage
 * - Clinical validation of wire sequence progression steps
 * - Form 043/y structured SOAP visit note generation
 */

import type { BracketPrescriptionId, SlotSize, ToothBracketStatus } from "./bracketPrescriptions";

export type WireMaterial =
	| "niti_superelastic" // Суперэластичный никель-титан (SE NiTi)
	| "copper_niti" // Медно-никель-титановая термоактивная дуга (Cu-NiTi)
	| "stainless_steel" // Медицинская нержавеющая сталь (Stainless Steel / SS)
	| "tma_beta_ti" // Бета-титан / ТМА (Titanium Molybdenum Alloy)
	| "braided_steel"; // 8-жильная плетеная сталь (Braided Steel)

export type WireShape = "round" | "rectangular" | "square";

export type WireSize =
	| ".012"
	| ".014"
	| ".016"
	| ".018"
	| ".020"
	| ".014x.025"
	| ".016x.016"
	| ".016x.022"
	| ".017x.025"
	| ".018x.025"
	| ".019x.025"
	| ".021x.025";

export type WireTreatmentStage =
	| "leveling_aligning" // 1. Нивелирование и выравнивание
	| "working_space_closure" // 2. Закрытие промежутков и корпусный перенос
	| "finishing_detailing" // 3. Юстировка и финишная детализация
	| "retention"; // 4. Ретенция

export interface ArchwireSpec {
	readonly id: string;
	readonly material: WireMaterial;
	readonly materialLabel: string;
	readonly size: WireSize;
	readonly shape: WireShape;
	readonly stage: WireTreatmentStage;
	readonly stageLabel: string;
	readonly label: string;
	readonly recommendedWearWeeksMin: number;
	readonly recommendedWearWeeksMax: number;
	readonly clinicalPurpose: string;
	readonly crossSectionWidthIn: number;
	readonly crossSectionHeightIn: number;
}

export interface TorquePlayCalculation {
	readonly wireSize: WireSize;
	readonly slotSize: SlotSize;
	readonly clearanceHeightIn: number;
	readonly clearanceWidthIn: number;
	readonly playAngleDegrees: number;
	readonly maxTorqueTransmissionPercent: number;
	readonly isTorqueActive: boolean;
	readonly clinicalNote: string;
}

export interface ArchwireVisitLog {
	readonly id: string;
	readonly visitDate: string;
	readonly patientId?: string | undefined;
	readonly arch: "upper" | "lower" | "both";
	readonly upperWireSize?: WireSize | undefined;
	readonly upperWireMaterial?: WireMaterial | undefined;
	readonly lowerWireSize?: WireSize | undefined;
	readonly lowerWireMaterial?: WireMaterial | undefined;
	readonly elasticsPattern?: string | undefined;
	readonly bracketActions: Array<{
		readonly toothNumber: number;
		readonly action: ToothBracketStatus | "hook_added";
		readonly bracketSystem?: string | undefined;
		readonly reason?: string | undefined;
	}>;
	readonly doctorName: string;
	readonly appointmentIntervalWeeks: number;
	readonly notes: string;
}

export interface ElasticPreset {
	readonly id: string;
	readonly name: string;
	readonly animalCode: string;
	readonly dimension: string;
	readonly forceLevel: string;
	readonly indication: string;
}

// ─── Stage & Material Reference Dictionaries ─────────────────────────────────

export const STAGE_LABELS: Record<WireTreatmentStage, string> = {
	leveling_aligning: "1. Нивелирование и выравнивание",
	working_space_closure: "2. Закрытие промежутков (Рабочий этап)",
	finishing_detailing: "3. Финишная юстировка и детализация",
	retention: "4. Ретенционный период",
};

export const MATERIAL_LABELS: Record<WireMaterial, string> = {
	niti_superelastic: "NiTi (Суперэластичный)",
	copper_niti: "Cu-NiTi (Термоактивный с медью)",
	stainless_steel: "SS (Нержавеющая сталь)",
	tma_beta_ti: "TMA (Бета-титан)",
	braided_steel: "Braided (8-жильная плетеная сталь)",
};

// ─── Standard Orthodontic Archwires Catalog ─────────────────────────────────

export const STANDARD_ARCHWIRES: readonly ArchwireSpec[] = [
	// ─── Stage 1: Leveling & Alignment ───
	{
		id: "niti_012",
		material: "niti_superelastic",
		materialLabel: "NiTi Суперэластик",
		size: ".012",
		shape: "round",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "NiTi .012 (Круглая легкая)",
		recommendedWearWeeksMin: 4,
		recommendedWearWeeksMax: 8,
		clinicalPurpose: "Первичное деликатное распутывание выраженной скученности и деротация",
		crossSectionWidthIn: 0.012,
		crossSectionHeightIn: 0.012,
	},
	{
		id: "niti_014",
		material: "niti_superelastic",
		materialLabel: "NiTi Суперэластик",
		size: ".014",
		shape: "round",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "NiTi .014 (Круглая стандартная)",
		recommendedWearWeeksMin: 6,
		recommendedWearWeeksMax: 10,
		clinicalPurpose: "Базовое нивелирование кривой Шпее, деротация резцов и премоляров",
		crossSectionWidthIn: 0.014,
		crossSectionHeightIn: 0.014,
	},
	{
		id: "niti_016",
		material: "niti_superelastic",
		materialLabel: "NiTi Суперэластик",
		size: ".016",
		shape: "round",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "NiTi .016 (Круглая средняя)",
		recommendedWearWeeksMin: 6,
		recommendedWearWeeksMax: 10,
		clinicalPurpose: "Завершение первичного нивелирования и подготовка к переходу на прямоугольные дуги",
		crossSectionWidthIn: 0.016,
		crossSectionHeightIn: 0.016,
	},
	{
		id: "niti_018",
		material: "niti_superelastic",
		materialLabel: "NiTi Суперэластик",
		size: ".018",
		shape: "round",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "NiTi .018 (Круглая жесткая)",
		recommendedWearWeeksMin: 6,
		recommendedWearWeeksMax: 8,
		clinicalPurpose: "Выравнивание окклюзионной плоскости (особенно актуально для паза .018 Alexander)",
		crossSectionWidthIn: 0.018,
		crossSectionHeightIn: 0.018,
	},
	{
		id: "cuniti_014x025",
		material: "copper_niti",
		materialLabel: "Cu-NiTi 27°C / 35°C",
		size: ".014x.025",
		shape: "rectangular",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "Cu-NiTi .014x.025 (Термоактивная)",
		recommendedWearWeeksMin: 8,
		recommendedWearWeeksMax: 12,
		clinicalPurpose: "Ранний трехмерный контроль торка и экспансия зубного ряда при низком уровне трения",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.014,
	},
	{
		id: "cuniti_016x022",
		material: "copper_niti",
		materialLabel: "Cu-NiTi 35°C",
		size: ".016x.022",
		shape: "rectangular",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "Cu-NiTi .016x.022 (Термоактивная)",
		recommendedWearWeeksMin: 8,
		recommendedWearWeeksMax: 12,
		clinicalPurpose: "Переходная прямоугольная дуга: выравнивание высоты слотов и экспрессия торка",
		crossSectionWidthIn: 0.022,
		crossSectionHeightIn: 0.016,
	},
	{
		id: "cuniti_017x025",
		material: "copper_niti",
		materialLabel: "Cu-NiTi 35°C Damon",
		size: ".017x.025",
		shape: "rectangular",
		stage: "leveling_aligning",
		stageLabel: STAGE_LABELS.leveling_aligning,
		label: "Cu-NiTi .017x.025 (Силовая термоактивная)",
		recommendedWearWeeksMin: 10,
		recommendedWearWeeksMax: 14,
		clinicalPurpose: "Полноценная экспрессия торка перед переходом на сталь в системе Damon",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.017,
	},

	// ─── Stage 2: Working & Space Closure ───
	{
		id: "ss_016x022",
		material: "stainless_steel",
		materialLabel: "Сталь SS",
		size: ".016x.022",
		shape: "rectangular",
		stage: "working_space_closure",
		stageLabel: STAGE_LABELS.working_space_closure,
		label: "SS .016x.022 (Стальная рабочая)",
		recommendedWearWeeksMin: 8,
		recommendedWearWeeksMax: 16,
		clinicalPurpose: "Основная рабочая дуга для паза .018: закрытие промежутков скользящей механикой",
		crossSectionWidthIn: 0.022,
		crossSectionHeightIn: 0.016,
	},
	{
		id: "ss_019x025",
		material: "stainless_steel",
		materialLabel: "Сталь SS",
		size: ".019x.025",
		shape: "rectangular",
		stage: "working_space_closure",
		stageLabel: STAGE_LABELS.working_space_closure,
		label: "SS .019x.025 (Стальная жесткая силовая)",
		recommendedWearWeeksMin: 12,
		recommendedWearWeeksMax: 24,
		clinicalPurpose: "Главная силовая дуга паза .022: закрытие постэкстракционных промежутков, эластики II/III класса",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.019,
	},
	{
		id: "ss_021x025",
		material: "stainless_steel",
		materialLabel: "Сталь SS",
		size: ".021x.025",
		shape: "rectangular",
		stage: "working_space_closure",
		stageLabel: STAGE_LABELS.working_space_closure,
		label: "SS .021x.025 (Максимальный торк)",
		recommendedWearWeeksMin: 8,
		recommendedWearWeeksMax: 16,
		clinicalPurpose: "Максимальное заполнение паза .022 для 100% реализации торка и стабилизации анкоража",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.021,
	},

	// ─── Stage 3: Finishing & Detailing ───
	{
		id: "tma_017x025",
		material: "tma_beta_ti",
		materialLabel: "TMA Бета-титан",
		size: ".017x.025",
		shape: "rectangular",
		stage: "finishing_detailing",
		stageLabel: STAGE_LABELS.finishing_detailing,
		label: "TMA .017x.025 (Бета-титан финишная)",
		recommendedWearWeeksMin: 6,
		recommendedWearWeeksMax: 12,
		clinicalPurpose: "Индивидуальные изгибы 1-го, 2-го и 3-го порядков, мягкая финишная доводка окклюзии",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.017,
	},
	{
		id: "tma_019x025",
		material: "tma_beta_ti",
		materialLabel: "TMA Бета-титан",
		size: ".019x.025",
		shape: "rectangular",
		stage: "finishing_detailing",
		stageLabel: STAGE_LABELS.finishing_detailing,
		label: "TMA .019x.025 (Бета-титан жесткая)",
		recommendedWearWeeksMin: 8,
		recommendedWearWeeksMax: 14,
		clinicalPurpose: "Финишная юстировка контактов, удержание формы дуги с коробочными эластиками",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.019,
	},
	{
		id: "braided_019x025",
		material: "braided_steel",
		materialLabel: "Braided 8-плетеный",
		size: ".019x.025",
		shape: "rectangular",
		stage: "finishing_detailing",
		stageLabel: STAGE_LABELS.finishing_detailing,
		label: "Braided SS .019x.025 (Плетеная финишная)",
		recommendedWearWeeksMin: 4,
		recommendedWearWeeksMax: 8,
		clinicalPurpose: "Вертикальное смыкание и интердигитация зубных рядов на легких эластиках",
		crossSectionWidthIn: 0.025,
		crossSectionHeightIn: 0.019,
	},
];

// ─── Intermaxillary Elastics Presets ─────────────────────────────────────────

export const ELASTICS_PRESETS: readonly ElasticPreset[] = [
	{
		id: "el_class_2_fox",
		name: "II класс (Fox)",
		animalCode: "Fox (Лиса)",
		dimension: "1/4 in (6.4 мм)",
		forceLevel: "3.5 oz (Medium)",
		indication: "Тяга 13/23 к 46/36 для коррекции дистального прикуса и ретракции резцов в/ч",
	},
	{
		id: "el_class_2_bear",
		name: "II класс усиленная (Bear)",
		animalCode: "Bear (Медведь)",
		dimension: "1/4 in (6.4 мм)",
		forceLevel: "4.5 oz (Heavy)",
		indication: "Интенсивная сагиттальная коррекция II класса у взрослых пациентов",
	},
	{
		id: "el_class_3_rabbit",
		name: "III класс (Rabbit)",
		animalCode: "Rabbit (Кролик)",
		dimension: "3/16 in (4.8 мм)",
		forceLevel: "3.5 oz (Medium)",
		indication: "Тяга 43/33 к 16/26 для коррекции мезиального прикуса и ретракции нижнего фронта",
	},
	{
		id: "el_class_3_kangaroo",
		name: "III класс усиленная (Kangaroo)",
		animalCode: "Kangaroo (Кенгуру)",
		dimension: "3/16 in (4.8 мм)",
		forceLevel: "4.5 oz (Heavy)",
		indication: "Интенсивная тяга III класса при значительном обратном резцовом перекрытии",
	},
	{
		id: "el_box_monkey",
		name: "Коробочные эластики (Monkey)",
		animalCode: "Monkey (Обезьяна)",
		dimension: "3/8 in (9.5 мм)",
		forceLevel: "3.5 oz (Medium)",
		indication: "Квадратная/коробочная тяга для закрытия бокового открытого прикуса и интердигитации",
	},
	{
		id: "el_cross_zebra",
		name: "Перекрестные эластики (Zebra)",
		animalCode: "Zebra (Зебра)",
		dimension: "1/4 in (6.4 мм)",
		forceLevel: "6.0 oz (Extra-Heavy)",
		indication: "Трансверзальная тяга со щечной поверхности на небную для устранения перекрестного прикуса",
	},
];

// ─── Mathematical Engine: Torque Play & Physical Clearance ──────────────────

/**
 * Calculates theoretical torsional clearance (torque play angle) between wire and slot:
 * θ_play = arcsin((SlotHeight - WireHeight) / WireWidth) * (180 / π) with corner bevel allowance
 */
export function calculateTorquePlay(wireSize: WireSize, slotSize: SlotSize): TorquePlayCalculation {
	const slotH = slotSize === ".022" ? 0.022 : 0.018;
	const slotW = slotSize === ".022" ? 0.028 : 0.025;

	// Parse dimensions
	let wireH = 0;
	let wireW = 0;

	if (wireSize.includes("x")) {
		const parts = wireSize.split("x");
		wireH = Number(parts[0]);
		wireW = Number(parts[1]);
	} else {
		wireH = Number(wireSize);
		wireW = Number(wireSize);
	}

	const clearanceH = Number((slotH - wireH).toFixed(4));
	const clearanceW = Number((slotW - wireW).toFixed(4));

	// If wire is round, torsional play is 90° (0% torque control)
	if (!wireSize.includes("x")) {
		return {
			wireSize,
			slotSize,
			clearanceHeightIn: clearanceH,
			clearanceWidthIn: clearanceW,
			playAngleDegrees: 90,
			maxTorqueTransmissionPercent: 0,
			isTorqueActive: false,
			clinicalNote: "Круглая дуга: свободное вращение в пазе, передача торка = 0%. Только нивелирование и деротация.",
		};
	}

	// Rectangular wire in slot
	// Standard orthodontic formula with edge bevel factor (~0.001 in bevel)
	const deltaH = Math.max(0, slotH - wireH);
	const effWidth = Math.max(0.01, wireW - 0.001);
	const ratio = Math.min(1.0, deltaH / effWidth);
	const rawPlay = Math.asin(ratio) * (180 / Math.PI);
	const playAngle = Number(rawPlay.toFixed(1));

	// Transmission percentage estimate based on active torque engagement
	let maxTorquePercent = 0;
	if (playAngle <= 3.0) {
		maxTorquePercent = 96;
	} else if (playAngle <= 6.0) {
		maxTorquePercent = 88;
	} else if (playAngle <= 11.0) {
		maxTorquePercent = 72;
	} else if (playAngle <= 16.0) {
		maxTorquePercent = 55;
	} else {
		maxTorquePercent = 30;
	}

	let note = "";
	if (playAngle <= 5.0) {
		note = "Плотный контакт: полный 3D-контроль торка с минимальным люфтом.";
	} else if (playAngle <= 12.0) {
		note = "Умеренный люфт: эффективный рабочий торк с легким скольжением.";
	} else {
		note = "Широкий люфт: частичная передача торка, низкое сопротивление трения.";
	}

	return {
		wireSize,
		slotSize,
		clearanceHeightIn: clearanceH,
		clearanceWidthIn: clearanceW,
		playAngleDegrees: playAngle,
		maxTorqueTransmissionPercent: maxTorquePercent,
		isTorqueActive: true,
		clinicalNote: note,
	};
}

// ─── Wire Progression Validation ─────────────────────────────────────────────

export interface WireValidationResult {
	readonly isValid: boolean;
	readonly warning?: string;
	readonly transitionDescription: string;
}

export function validateWireProgression(
	currentWireSize: WireSize | null,
	nextWireSize: WireSize,
	slotSize: SlotSize = ".022",
): WireValidationResult {
	if (!currentWireSize) {
		return {
			isValid: true,
			transitionDescription: "Первичная фиксация дуги",
		};
	}

	const order: WireSize[] = [
		".012",
		".014",
		".016",
		".018",
		".014x.025",
		".016x.022",
		".017x.025",
		".019x.025",
		".021x.025",
	];

	const currentIndex = order.indexOf(currentWireSize);
	const nextIndex = order.indexOf(nextWireSize);

	if (currentIndex === -1 || nextIndex === -1) {
		return {
			isValid: true,
			transitionDescription: "Индивидуальная смена дуги",
		};
	}

	if (slotSize === ".018" && (nextWireSize === ".019x.025" || nextWireSize === ".021x.025")) {
		return {
			isValid: false,
			warning: "Дуга не поместится в паз .018! Максимальный размер для паза .018 — .017x.025 или .016x.022.",
			transitionDescription: "Несовместимость с пазом .018",
		};
	}

	const diff = nextIndex - currentIndex;

	if (diff === 0) {
		return {
			isValid: true,
			transitionDescription: "Повторная активация той же размерности дуги",
		};
	}

	if (diff < 0) {
		return {
			isValid: true,
			warning: "Шаг назад (Down-sizing): снижение жесткости дуги. Применяется при рецидиве ротаций или переклейке замков.",
			transitionDescription: "Снижение калибра дуги (Step-down)",
		};
	}

	if (diff > 2) {
		return {
			isValid: false,
			warning: "ОПАСНЫЙ СКАЧОК: пропуск промежуточных калибров дуг может вызвать резорбцию корней, отрыв брекетов или некроз пульпы!",
			transitionDescription: "Небезопасный форсированный переход",
		};
	}

	return {
		isValid: true,
		transitionDescription: "Последовательный клинический переход",
	};
}

// ─── Standard Sequence Selector for Prescriptions ───────────────────────────

export function getStandardSequenceForPrescription(
	prescriptionId: BracketPrescriptionId,
): ArchwireSpec[] {
	if (prescriptionId === "alexander_018") {
		return STANDARD_ARCHWIRES.filter((w) =>
			[
				"niti_014",
				"niti_016",
				"niti_018",
				"ss_016x022",
				"tma_017x025",
			].includes(w.id),
		);
	}

	if (prescriptionId.startsWith("damon_q")) {
		return STANDARD_ARCHWIRES.filter((w) =>
			[
				"niti_014",
				"cuniti_014x025",
				"cuniti_017x025",
				"ss_019x025",
				"tma_019x025",
			].includes(w.id),
		);
	}

	// Standard Roth / MBT .022 sequence
	return STANDARD_ARCHWIRES.filter((w) =>
		[
			"niti_014",
			"niti_016",
			"niti_018",
			"cuniti_016x022",
			"ss_019x025",
			"tma_019x025",
			"braided_019x025",
		].includes(w.id),
	);
}

export function getArchwiresByStage(stage: WireTreatmentStage): ArchwireSpec[] {
	return STANDARD_ARCHWIRES.filter((w) => w.stage === stage);
}

export function getArchwireSpec(size: WireSize, material?: WireMaterial): ArchwireSpec | undefined {
	if (material) {
		return STANDARD_ARCHWIRES.find((w) => w.size === size && w.material === material);
	}
	return STANDARD_ARCHWIRES.find((w) => w.size === size);
}

// ─── SOAP Clinical Protocol Text Generator ──────────────────────────────────

export function generateOrthodonticVisitSoapNote(log: ArchwireVisitLog): string {
	const lines: string[] = [];


	lines.push("═════ ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЕМА (ФОРМА 043/У) ═════");
	lines.push("Дата приема: " + (log.visitDate || new Date().toLocaleDateString("ru-RU")));
	lines.push("Лечащий врач-ортодонт: " + (log.doctorName || "Врач-ортодонт"));
	lines.push("");

	lines.push("S (Жалобы):");
	lines.push("Жалобы на умеренное натяжение после предыдущей активации. Натирания слизистой оболочки нет. Гигиена удовлетворительная.");
	lines.push("");

	lines.push("O (Объективный статус и выполненные манипуляции):");
	if (log.upperWireSize) {
		const mat = log.upperWireMaterial ? MATERIAL_LABELS[log.upperWireMaterial] : "NiTi";
		lines.push("• Верхняя челюсть: зафиксирована дуга " + mat + " " + log.upperWireSize + ". Замки закрыты/лигированы эластическими лигатурами.");
	}
	if (log.lowerWireSize) {
		const mat = log.lowerWireMaterial ? MATERIAL_LABELS[log.lowerWireMaterial] : "NiTi";
		lines.push("• Нижняя челюсть: зафиксирована дуга " + mat + " " + log.lowerWireSize + ". Лигирование проведено по протоколу.");
	}

	if (log.bracketActions && log.bracketActions.length > 0) {
		lines.push("• Манипуляции с брекетами/замками:");
		for (const act of log.bracketActions) {
			const actName =
				act.action === "fixed"
					? "первичная фиксация"
					: act.action === "rebonded"
						? "повторная переклейка"
						: act.action === "lost"
							? "скол замка"
							: act.action === "debonded"
								? "дебондинг"
								: act.action === "planned"
									? "запланирована фиксация"
									: act.action === "not_indicated"
										? "не показан (отсутствует)"
										: "установка крючка";
			const reasonStr = act.reason ? " (причина: " + act.reason + ")" : "";
			lines.push("   - Зуб " + act.toothNumber + ": " + actName + reasonStr);
		}
	}

	if (log.elasticsPattern) {
		lines.push("• Межчелюстная эластическая тяга: " + log.elasticsPattern + ".");
	}

	if (log.notes) {
		lines.push("• Особые отметки: " + log.notes);
	}
	lines.push("");

	lines.push("A (Клиническая оценка):");
	lines.push("Динамика перемещения зубов положительная. Окклюзионные контакты стабильны. Экспрессия торка и ангуляции соответствует этапу лечения.");
	lines.push("");

	lines.push("P (Назначения и план):");
	lines.push("1. Ношение межчелюстных эластиков в режиме 22 ч/сутки со сменой каждые 12 часов.");
	lines.push("2. Соблюдение диеты с исключением твердой и липкой пищи, тщательная гигиена ершиками и монопучковой щеткой.");
	lines.push("3. Следующий контрольный визит через " + (log.appointmentIntervalWeeks || 6) + " недель.");

	return lines.join("\n");
}
