/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORTHODONTIC BRACKET PRESCRIPTIONS MATHEMATICAL ENGINE & CLINICAL REFERENCE
 * (Справочник и движок прописей брекет-систем: Roth, MBT, Damon Q, Alexander)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements exact nominal torque, angulation (tip), and rotation (in-out / offset)
 * specifications for all permanent teeth 18..48 according to canonical orthodontic
 * prescriptions:
 * - Roth Prescription (.022 slot)
 * - MBT Prescription (.022 slot, McLaughlin-Bennett-Trevisi)
 * - Damon Q Passive Self-Ligating (Standard, High Torque, Low Torque .022 slot)
 * - Alexander Discipline (.018 slot, Vari-Simplex)
 */

export type BracketPrescriptionId =
	| "roth_022"
	| "mbt_022"
	| "damon_q_standard"
	| "damon_q_high_torque"
	| "damon_q_low_torque"
	| "alexander_018"
	| "custom";

export type SlotSize = ".018" | ".022";

export type BracketLigatingType = "conventional_ligating" | "self_ligating";

export type ToothBracketStatus =
	| "fixed" // Зафиксирован
	| "rebonded" // Переклеен / заменен
	| "lost" // Скол / утерян
	| "debonded" // Снят
	| "planned" // Запланирован
	| "not_indicated"; // Не показан (удален/отсутствует/имплантат)

export interface ToothBracketSpec {
	readonly toothNumber: number;
	readonly toothName: string;
	readonly arch: "upper" | "lower";
	readonly quadrant: 1 | 2 | 3 | 4;
	readonly isAnterior: boolean;
	readonly nominalTorque: number; // Торк в градусах (Torque °)
	readonly nominalAngulation: number; // Ангуляция в градусах (Tip / Angulation °)
	readonly nominalRotation: number; // Ротация / дистальный оффсет (Rotation / In-Out Offset °)
	readonly slotSize: SlotSize;
	readonly hookAvailable: boolean;
	readonly notes?: string;
}

export interface BracketPrescription {
	readonly id: BracketPrescriptionId;
	readonly name: string;
	readonly shortDescription: string;
	readonly slotSize: SlotSize;
	readonly ligatingType: BracketLigatingType;
	readonly teeth: Record<number, ToothBracketSpec>;
	readonly features: readonly string[];
	readonly clinicalIndications: readonly string[];
}

export interface PatientToothBracketState {
	readonly toothNumber: number;
	status: ToothBracketStatus;
	customTorque?: number | undefined;
	customAngulation?: number | undefined;
	customRotation?: number | undefined;
	slotSize?: SlotSize | undefined;
	bracketBrand?: string | undefined;
	hasHook?: boolean | undefined;
	notes?: string | undefined;
	lastModified?: string | undefined;
}

// ─── Universal FDI Teeth Metadata Helpers ────────────────────────────────────

export const ALL_FDI_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

export const UPPER_ARCH_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
];

export const LOWER_ARCH_TEETH: readonly number[] = [
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

export const ANTERIOR_TEETH: readonly number[] = [
	13, 12, 11, 21, 22, 23,
	43, 42, 41, 31, 32, 33,
];

export function isUpperTooth(toothNumber: number): boolean {
	return (toothNumber >= 11 && toothNumber <= 28) || (toothNumber >= 51 && toothNumber <= 68);
}

export function isLowerTooth(toothNumber: number): boolean {
	return (toothNumber >= 31 && toothNumber <= 48) || (toothNumber >= 71 && toothNumber <= 88);
}

export function isAnteriorTooth(toothNumber: number): boolean {
	const lastDigit = toothNumber % 10;
	return lastDigit >= 1 && lastDigit <= 3;
}

export function getQuadrant(toothNumber: number): 1 | 2 | 3 | 4 {
	const q = Math.floor(toothNumber / 10);
	if (q === 1 || q === 5) return 1;
	if (q === 2 || q === 6) return 2;
	if (q === 3 || q === 7) return 3;
	return 4;
}

export function formatToothNameFdi(toothNumber: number): string {
	const names: Record<number, string> = {
		18: "18 Верхний правый третий моляр",
		17: "17 Верхний правый второй моляр",
		16: "16 Верхний правый первый моляр",
		15: "15 Верхний правый второй премоляр",
		14: "14 Верхний правый первый премоляр",
		13: "13 Верхний правый клык",
		12: "12 Верхний правый латеральный резец",
		11: "11 Верхний правый центральный резец",
		21: "21 Верхний левый центральный резец",
		22: "22 Верхний левый латеральный резец",
		23: "23 Верхний левый клык",
		24: "24 Верхний левый первый премоляр",
		25: "25 Верхний левый второй премоляр",
		26: "26 Верхний левый первый моляр",
		27: "27 Верхний левый второй моляр",
		28: "28 Верхний левый третий моляр",
		48: "48 Нижний правый третий моляр",
		47: "47 Нижний правый второй моляр",
		46: "46 Нижний правый первый моляр",
		45: "45 Нижний правый второй премоляр",
		44: "44 Нижний правый первый премоляр",
		43: "43 Нижний правый клык",
		42: "42 Нижний правый латеральный резец",
		41: "41 Нижний правый центральный резец",
		31: "31 Нижний левый центральный резец",
		32: "32 Нижний левый латеральный резец",
		33: "33 Нижний левый клык",
		34: "34 Нижний левый первый премоляр",
		35: "35 Нижний левый второй премоляр",
		36: "36 Нижний левый первый моляр",
		37: "37 Нижний левый второй моляр",
		38: "38 Нижний левый третий моляр",
	};
	return names[toothNumber] ?? (toothNumber + " Зуб");
}

// ─── Builder Helper ──────────────────────────────────────────────────────────

function buildSymmetricArch(
	slotSize: SlotSize,
	upperQuadrant: Record<number, { t: number; a: number; r: number; h?: boolean }>,
	lowerQuadrant: Record<number, { t: number; a: number; r: number; h?: boolean }>,
): Record<number, ToothBracketSpec> {
	const res: Record<number, ToothBracketSpec> = {};

	// Upper Right (Q1: 18..11) & Upper Left (Q2: 21..28)
	for (let i = 1; i <= 8; i++) {
		const spec = upperQuadrant[i] ?? { t: 0, a: 0, r: 0 };
		const t1 = 10 + i;
		const t2 = 20 + i;
		res[t1] = {
			toothNumber: t1,
			toothName: formatToothNameFdi(t1),
			arch: "upper",
			quadrant: 1,
			isAnterior: i <= 3,
			nominalTorque: spec.t,
			nominalAngulation: spec.a,
			nominalRotation: spec.r,
			slotSize,
			hookAvailable: spec.h ?? (i === 3 || i === 4 || i === 5 || i >= 6),
		};
		res[t2] = {
			toothNumber: t2,
			toothName: formatToothNameFdi(t2),
			arch: "upper",
			quadrant: 2,
			isAnterior: i <= 3,
			nominalTorque: spec.t,
			nominalAngulation: spec.a,
			nominalRotation: spec.r,
			slotSize,
			hookAvailable: spec.h ?? (i === 3 || i === 4 || i === 5 || i >= 6),
		};
	}

	// Lower Right (Q4: 48..41) & Lower Left (Q3: 31..38)
	for (let i = 1; i <= 8; i++) {
		const spec = lowerQuadrant[i] ?? { t: 0, a: 0, r: 0 };
		const t4 = 40 + i;
		const t3 = 30 + i;
		res[t4] = {
			toothNumber: t4,
			toothName: formatToothNameFdi(t4),
			arch: "lower",
			quadrant: 4,
			isAnterior: i <= 3,
			nominalTorque: spec.t,
			nominalAngulation: spec.a,
			nominalRotation: spec.r,
			slotSize,
			hookAvailable: spec.h ?? (i === 3 || i === 4 || i === 5 || i >= 6),
		};
		res[t3] = {
			toothNumber: t3,
			toothName: formatToothNameFdi(t3),
			arch: "lower",
			quadrant: 3,
			isAnterior: i <= 3,
			nominalTorque: spec.t,
			nominalAngulation: spec.a,
			nominalRotation: spec.r,
			slotSize,
			hookAvailable: spec.h ?? (i === 3 || i === 4 || i === 5 || i >= 6),
		};
	}

	return res;
}

// ─── 1. ROTH .022 PRESCRIPTION ───────────────────────────────────────────────

export const ROTH_022_PRESCRIPTION: BracketPrescription = {
	id: "roth_022",
	name: "Roth .022",
	shortDescription: "Классическая пропись Рота с выраженной ангуляцией клыков и овер-коррекцией",
	slotSize: ".022",
	ligatingType: "conventional_ligating",
	teeth: buildSymmetricArch(
		".022",
		{
			1: { t: 12, a: 5, r: 0 },
			2: { t: 8, a: 9, r: 0 },
			3: { t: -2, a: 11, r: 4, h: true },
			4: { t: -7, a: 0, r: 0, h: true },
			5: { t: -7, a: 0, r: 0, h: true },
			6: { t: -14, a: 0, r: 14, h: true },
			7: { t: -14, a: 0, r: 14, h: true },
			8: { t: -14, a: 0, r: 14, h: true },
		},
		{
			1: { t: -1, a: 0, r: 0 },
			2: { t: -1, a: 0, r: 0 },
			3: { t: -11, a: 5, r: 2, h: true },
			4: { t: -17, a: 0, r: 0, h: true },
			5: { t: -17, a: 0, r: 0, h: true },
			6: { t: -30, a: 0, r: 4, h: true },
			7: { t: -30, a: 0, r: 4, h: true },
			8: { t: -30, a: 0, r: 4, h: true },
		},
	),
	features: [
		"Торк верхних центральных резцов: +12°",
		"Выраженная ангуляция верхних клыков: +11° (для стабильного клыкового ведения)",
		"Отрицательный торк нижних моляров: -30° (защита от перекрестного прикуса)",
		"Дистальный оффсет верхних моляров: +14°",
	],
	clinicalIndications: [
		"Лечение без удаления и с удалением премоляров",
		"Выраженная скученность фронтального отдела",
		"Классическая лигатурная скользящая механика",
	],
};

// ─── 2. MBT .022 PRESCRIPTION ───────────────────────────────────────────────

export const MBT_022_PRESCRIPTION: BracketPrescription = {
	id: "mbt_022",
	name: "MBT .022",
	shortDescription: "Пропись Маклафлина-Беннетта-Тревизи с увеличенным торком резцов и сниженной ангуляцией клыков",
	slotSize: ".022",
	ligatingType: "conventional_ligating",
	teeth: buildSymmetricArch(
		".022",
		{
			1: { t: 17, a: 4, r: 0 },
			2: { t: 10, a: 8, r: 0 },
			3: { t: -7, a: 8, r: 0, h: true },
			4: { t: -7, a: 0, r: 0, h: true },
			5: { t: -7, a: 0, r: 0, h: true },
			6: { t: -14, a: 0, r: 10, h: true },
			7: { t: -14, a: 0, r: 10, h: true },
			8: { t: -14, a: 0, r: 10, h: true },
		},
		{
			1: { t: -6, a: 0, r: 0 },
			2: { t: -6, a: 0, r: 0 },
			3: { t: -6, a: 3, r: 0, h: true },
			4: { t: -12, a: 2, r: 0, h: true },
			5: { t: -17, a: 2, r: 0, h: true },
			6: { t: -20, a: 0, r: 0, h: true },
			7: { t: -10, a: 0, r: 0, h: true },
			8: { t: -10, a: 0, r: 0, h: true },
		},
	),
	features: [
		"Увеличенный торк верхних резцов: +17° (компенсация потери торка при скольжении)",
		"Умеренная ангуляция верхних клыков: +8° (предотвращает выдвижение верхушек корней)",
		"Торк нижних резцов: -6° (сохранение корней в губчатой кости)",
		"Торк нижних моляров: -20° и -10° (менее глубокий овер-торк по сравнению с Roth)",
	],
	clinicalIndications: [
		"Скользящая механика на жестких дугах SS .019x.025",
		"Лечение с удалением премоляров и ретракцией фронта",
		"Случаи с тенденцией к ретроклинации резцов",
	],
};

// ─── 3. DAMON Q STANDARD .022 PRESCRIPTION ──────────────────────────────────

export const DAMON_Q_STANDARD_PRESCRIPTION: BracketPrescription = {
	id: "damon_q_standard",
	name: "Damon Q Standard .022",
	shortDescription: "Пассивная самолигирующая система Damon Q со стандартным торком для гармоничного расширения",
	slotSize: ".022",
	ligatingType: "self_ligating",
	teeth: buildSymmetricArch(
		".022",
		{
			1: { t: 12, a: 5, r: 0 },
			2: { t: 8, a: 9, r: 0 },
			3: { t: 0, a: 6, r: 0, h: true },
			4: { t: -11, a: 2, r: 0, h: true },
			5: { t: -11, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 12, h: true },
			7: { t: -10, a: 0, r: 12, h: true },
			8: { t: -10, a: 0, r: 12, h: true },
		},
		{
			1: { t: -1, a: 2, r: 0 },
			2: { t: -1, a: 2, r: 0 },
			3: { t: 7, a: 5, r: 0, h: true },
			4: { t: -12, a: 2, r: 0, h: true },
			5: { t: -17, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 2, h: true },
			7: { t: -10, a: 0, r: 2, h: true },
			8: { t: -10, a: 0, r: 2, h: true },
		},
	),
	features: [
		"Низкое трение пассивного замка (SpinTek)",
		"Нейтральный торк верхних клыков: 0°",
		"Положительный торк нижних клыков: +7° (поддержка вертикали)",
		"Мягкий наклон премоляров и моляров: -11° и -10°",
	],
	clinicalIndications: [
		"Лечение без удаления зубов с биологическим расширением зубных рядов",
		"Умеренная скученность и дефицит места",
		"Взрослая ортодонтия с деликатными силами",
	],
};

// ─── 4. DAMON Q HIGH TORQUE .022 PRESCRIPTION ───────────────────────────────

export const DAMON_Q_HIGH_TORQUE_PRESCRIPTION: BracketPrescription = {
	id: "damon_q_high_torque",
	name: "Damon Q High Torque .022",
	shortDescription: "Пропись Damon Q с высоким торком во фронтальном отделе (+17° резцы, +11° клыки)",
	slotSize: ".022",
	ligatingType: "self_ligating",
	teeth: buildSymmetricArch(
		".022",
		{
			1: { t: 17, a: 5, r: 0 },
			2: { t: 10, a: 9, r: 0 },
			3: { t: 11, a: 6, r: 0, h: true },
			4: { t: -11, a: 2, r: 0, h: true },
			5: { t: -11, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 12, h: true },
			7: { t: -10, a: 0, r: 12, h: true },
			8: { t: -10, a: 0, r: 12, h: true },
		},
		{
			1: { t: -1, a: 2, r: 0 },
			2: { t: -1, a: 2, r: 0 },
			3: { t: 13, a: 5, r: 0, h: true },
			4: { t: -12, a: 2, r: 0, h: true },
			5: { t: -17, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 2, h: true },
			7: { t: -10, a: 0, r: 2, h: true },
			8: { t: -10, a: 0, r: 2, h: true },
		},
	),
	features: [
		"Высокий торк верхних резцов: +17° (борьба с небным наклоном)",
		"Высокий торк верхних клыков: +11° (сохранение вестибулярного положения корня при расширении)",
		"Высокий торк нижних клыков: +13°",
	],
	clinicalIndications: [
		"II класс 2 подкласс по Энглю (ретроклинация резцов)",
		"Кросс-байт во фронтальном отделе",
		"Выраженное сужение зубной дуги с риском заваливания коронок внутрь",
	],
};

// ─── 5. DAMON Q LOW TORQUE .022 PRESCRIPTION ────────────────────────────────

export const DAMON_Q_LOW_TORQUE_PRESCRIPTION: BracketPrescription = {
	id: "damon_q_low_torque",
	name: "Damon Q Low Torque .022",
	shortDescription: "Пропись Damon Q с низким торком (+2° резцы, -11° нижние резцы) для контроля проклинации",
	slotSize: ".022",
	ligatingType: "self_ligating",
	teeth: buildSymmetricArch(
		".022",
		{
			1: { t: 2, a: 5, r: 0 },
			2: { t: -5, a: 9, r: 0 },
			3: { t: -9, a: 6, r: 0, h: true },
			4: { t: -11, a: 2, r: 0, h: true },
			5: { t: -11, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 12, h: true },
			7: { t: -10, a: 0, r: 12, h: true },
			8: { t: -10, a: 0, r: 12, h: true },
		},
		{
			1: { t: -11, a: 2, r: 0 },
			2: { t: -11, a: 2, r: 0 },
			3: { t: -11, a: 5, r: 0, h: true },
			4: { t: -12, a: 2, r: 0, h: true },
			5: { t: -17, a: 2, r: 0, h: true },
			6: { t: -10, a: 0, r: 2, h: true },
			7: { t: -10, a: 0, r: 2, h: true },
			8: { t: -10, a: 0, r: 2, h: true },
		},
	),
	features: [
		"Низкий торк верхних резцов: +2° (предотвращает избыточный протрузионный наклон)",
		"Отрицательный торк нижних резцов: -11° (удержание в симфизе при распутывании скученности)",
		"Отрицательный торк клыков: -9° (верх) и -11° (низ)",
	],
	clinicalIndications: [
		"III класс по Энглю (мезиальный прикус / прогения)",
		"Тенденция к бимаксиллярной протрузии",
		"Устранение скученности без проклинации нижних резцов",
	],
};

// ─── 6. ALEXANDER .018 PRESCRIPTION ─────────────────────────────────────────

export const ALEXANDER_018_PRESCRIPTION: BracketPrescription = {
	id: "alexander_018",
	name: "Alexander Discipline .018",
	shortDescription: "Дисциплина Александра на пазе .018 с гибкой крыльчатой системой и сильным контролем ротаций",
	slotSize: ".018",
	ligatingType: "conventional_ligating",
	teeth: buildSymmetricArch(
		".018",
		{
			1: { t: 14, a: 5, r: 0 },
			2: { t: 8, a: 9, r: 0 },
			3: { t: -3, a: 10, r: 0, h: true },
			4: { t: -7, a: 0, r: 0, h: true },
			5: { t: -7, a: 0, r: 0, h: true },
			6: { t: -14, a: 0, r: 10, h: true },
			7: { t: -14, a: 0, r: 10, h: true },
			8: { t: -14, a: 0, r: 10, h: true },
		},
		{
			1: { t: -5, a: 0, r: 0 },
			2: { t: -5, a: 0, r: 0 },
			3: { t: -7, a: 6, r: 0, h: true },
			4: { t: -11, a: 0, r: 0, h: true },
			5: { t: -17, a: 0, r: 0, h: true },
			6: { t: -25, a: 0, r: 6, h: true },
			7: { t: -25, a: 0, r: 6, h: true },
			8: { t: -25, a: 0, r: 6, h: true },
		},
	),
	features: [
		"Паз .018: ранний контроль трехмерного торка на легких прямоугольных дугах .016x.022 SS",
		"Торк верхних резцов: +14°",
		"Умеренная ангуляция верхних клыков: +10°",
		"Улучшенный контроль ротации моляров: +6° / +10°",
	],
	clinicalIndications: [
		"Клинические случаи, требующие раннего полного заполнения паза дугой",
		"Высокая точность позиционирования в финише",
		"Детская и подростковая ортодонтия",
	],
};

// ─── All Prescriptions Map ──────────────────────────────────────────────────

export const BRACKET_PRESCRIPTIONS: Record<BracketPrescriptionId, BracketPrescription> = {
	roth_022: ROTH_022_PRESCRIPTION,
	mbt_022: MBT_022_PRESCRIPTION,
	damon_q_standard: DAMON_Q_STANDARD_PRESCRIPTION,
	damon_q_high_torque: DAMON_Q_HIGH_TORQUE_PRESCRIPTION,
	damon_q_low_torque: DAMON_Q_LOW_TORQUE_PRESCRIPTION,
	alexander_018: ALEXANDER_018_PRESCRIPTION,
	custom: {
		id: "custom",
		name: "Индивидуальная пропись (Custom)",
		shortDescription: "Пользовательская пропись с произвольными значениями торка и ангуляции",
		slotSize: ".022",
		ligatingType: "conventional_ligating",
		teeth: { ...ROTH_022_PRESCRIPTION.teeth },
		features: ["Полная свобода настройки торка и ангуляции для каждого зуба"],
		clinicalIndications: ["Сложные асимметричные случаи, дистопии, ретинированные клыки"],
	},
};

export function getPrescription(id: BracketPrescriptionId): BracketPrescription {
	return BRACKET_PRESCRIPTIONS[id] ?? ROTH_022_PRESCRIPTION;
}

// ─── Mathematical Analysis & Comparison Helpers ─────────────────────────────

export interface PrescriptionComparisonItem {
	readonly toothNumber: number;
	readonly toothName: string;
	readonly baseTorque: number;
	readonly targetTorque: number;
	readonly torqueDiff: number;
	readonly baseAngulation: number;
	readonly targetAngulation: number;
	readonly angulationDiff: number;
	readonly baseRotation: number;
	readonly targetRotation: number;
	readonly rotationDiff: number;
}

export function comparePrescriptions(
	baseId: BracketPrescriptionId,
	targetId: BracketPrescriptionId,
): PrescriptionComparisonItem[] {
	const base = getPrescription(baseId);
	const target = getPrescription(targetId);

	return ALL_FDI_TEETH.map((tooth) => {
		const b = base.teeth[tooth] ?? { nominalTorque: 0, nominalAngulation: 0, nominalRotation: 0, toothName: "" };
		const t = target.teeth[tooth] ?? { nominalTorque: 0, nominalAngulation: 0, nominalRotation: 0, toothName: "" };

		return {
			toothNumber: tooth,
			toothName: formatToothNameFdi(tooth),
			baseTorque: b.nominalTorque,
			targetTorque: t.nominalTorque,
			torqueDiff: t.nominalTorque - b.nominalTorque,
			baseAngulation: b.nominalAngulation,
			targetAngulation: t.nominalAngulation,
			angulationDiff: t.nominalAngulation - b.nominalAngulation,
			baseRotation: b.nominalRotation,
			targetRotation: t.nominalRotation,
			rotationDiff: t.nominalRotation - b.nominalRotation,
		};
	});
}

export function calculateTorqueDeviation(
	toothNumber: number,
	customTorque: number,
	prescriptionId: BracketPrescriptionId,
): {
	nominalTorque: number;
	deviation: number;
	isSignificant: boolean;
	direction: "lingual_root" | "labial_root" | "match";
} {
	const pres = getPrescription(prescriptionId);
	const toothSpec = pres.teeth[toothNumber];
	const nominal = toothSpec ? toothSpec.nominalTorque : 0;
	const diff = customTorque - nominal;

	return {
		nominalTorque: nominal,
		deviation: diff,
		isSignificant: Math.abs(diff) >= 5,
		direction: diff > 0 ? "labial_root" : diff < 0 ? "lingual_root" : "match",
	};
}

export function createDefaultPatientBracketMatrix(
	prescriptionId: BracketPrescriptionId = "damon_q_standard",
): Record<number, PatientToothBracketState> {
	const pres = getPrescription(prescriptionId);
	const matrix: Record<number, PatientToothBracketState> = {};

	for (const tooth of ALL_FDI_TEETH) {
		const spec = pres.teeth[tooth];
		matrix[tooth] = {
			toothNumber: tooth,
			status: tooth % 10 === 8 ? "not_indicated" : "fixed",
			customTorque: spec?.nominalTorque,
			customAngulation: spec?.nominalAngulation,
			customRotation: spec?.nominalRotation,
			slotSize: pres.slotSize,
			bracketBrand: pres.name,
			hasHook: spec?.hookAvailable ?? false,
			notes: "",
		};
	}

	return matrix;
}
