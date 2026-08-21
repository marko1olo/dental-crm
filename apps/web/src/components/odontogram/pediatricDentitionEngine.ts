/**
 * DENTE Dental CRM — Pediatric Mixed Dentition & Cariogram Risk Classifier Engine
 *
 * Implements:
 * 1. Primary teeth FDI catalog (55..51, 61..65, 75..71, 85..81) and permanent successors.
 * 2. Root resorption stage morphology (0%, 25%, 50%, 75%, 100% exfoliated) with visual clipping.
 * 3. Eruption timeline calculator by chronological and dental age (6–12 years).
 * 4. Cariogram multi-factorial caries risk classifier per Professor Douglas Bratthall (WHO).
 * 5. SVG arc slice geometry generator for 5-sector Cariogram circle.
 */

import {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_TEETH,
	PRIMARY_LOWER_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	isPrimaryTooth,
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type DentitionStageCategory,
	type ToothExchangeStatus,
	type EruptionTimelineAnalysis,
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskCategory,
	type CariogramSectorBreakdown,
	calculateCariogramRisk,
	cariogramInputSchema,
} from "@dental/shared";

export {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_TEETH,
	PRIMARY_LOWER_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	isPrimaryTooth,
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type DentitionStageCategory,
	type ToothExchangeStatus,
	type EruptionTimelineAnalysis,
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskCategory,
	type CariogramSectorBreakdown,
	calculateCariogramRisk,
	cariogramInputSchema,
};

export type DentitionMode = "adult" | "pediatric" | "mixed";

export interface ResorptionVisualProps {
	readonly stage: ResorptionStagePercent;
	readonly rootOpacity: number;
	readonly rootStrokeDasharray?: string | undefined;
	readonly badgeText: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly descriptionRu: string;
	readonly clipHeightPercent: number; // Percentage of root visible from CEJ (100% down to 0%)
	readonly isExfoliated: boolean;
}

/**
 * Returns visual rendering properties for root resorption stages.
 */
export function getPrimaryToothResorptionVisual(
	toothNumber: number,
	stageInput?: ResorptionStagePercent | number | undefined,
): ResorptionVisualProps {
	if (!isPrimaryTooth(toothNumber)) {
		return {
			stage: 0,
			rootOpacity: 1.0,
			badgeText: "",
			badgeColor: "#10b981",
			badgeBg: "rgba(16, 185, 129, 0.12)",
			descriptionRu: "Постоянный зуб (резорбция не применима)",
			clipHeightPercent: 100,
			isExfoliated: false,
		};
	}

	const stageNum = (stageInput ?? 0) as ResorptionStagePercent;
	const validStage: ResorptionStagePercent = [0, 25, 50, 75, 100].includes(stageNum)
		? stageNum
		: 0;

	const def = RESORPTION_STAGE_DEFINITIONS[validStage];

	switch (validStage) {
		case 0:
			return {
				stage: 0,
				rootOpacity: 1.0,
				badgeText: "0%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 100,
				isExfoliated: false,
			};
		case 25:
			return {
				stage: 25,
				rootOpacity: 0.85,
				rootStrokeDasharray: "4 2",
				badgeText: "25%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 75,
				isExfoliated: false,
			};
		case 50:
			return {
				stage: 50,
				rootOpacity: 0.65,
				rootStrokeDasharray: "3 3",
				badgeText: "50%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 50,
				isExfoliated: false,
			};
		case 75:
			return {
				stage: 75,
				rootOpacity: 0.35,
				rootStrokeDasharray: "2 4",
				badgeText: "75%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 25,
				isExfoliated: false,
			};
		case 100:
			return {
				stage: 100,
				rootOpacity: 0.08,
				rootStrokeDasharray: "1 5",
				badgeText: "100%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 0,
				isExfoliated: true,
			};
	}
}

/**
 * Standard Default Cariogram Initial Values
 */
export const DEFAULT_CARIOGRAM_INPUT: CariogramInput = {
	dietContents: 1,
	dietFrequency: 1,
	plaqueAmount: 1,
	streptococcusMutans: 1,
	fluorideProgram: 1,
	salivaSecretionRate: 0,
	salivaBufferCapacity: 0,
	pastCariesExperience: 1,
	systemicDiseases: 0,
	clinicalJudgment: 1,
};

export interface CariogramPieSlice {
	readonly id: keyof CariogramSectorBreakdown;
	readonly nameRu: string;
	readonly percentage: number; // 0..100
	readonly startAngleRad: number;
	readonly endAngleRad: number;
	readonly pathData: string;
	readonly fillColor: string;
	readonly strokeColor: string;
	readonly descriptionRu: string;
}

/**
 * Generates SVG Path definitions for the 5 Cariogram sectors.
 * Starts from top (-PI/2) and draws clockwise slices.
 */
export function generateCariogramPieChartSlices(
	sectors: CariogramSectorBreakdown,
	radius = 120,
	innerRadius = 0,
	center = { x: 150, y: 150 },
): readonly CariogramPieSlice[] {
	const sectorConfig: ReadonlyArray<{
		id: keyof CariogramSectorBreakdown;
		nameRu: string;
		value: number;
		fillColor: string;
		strokeColor: string;
		descriptionRu: string;
	}> = [
		{
			id: "actualChanceOfAvoidingCaries",
			nameRu: "Шанс избежать кариеса",
			value: sectors.actualChanceOfAvoidingCaries,
			fillColor: "#10b981", // Green
			strokeColor: "#059669",
			descriptionRu: "Фактическая резистентность и защитные факторы",
		},
		{
			id: "dietSectorPercent",
			nameRu: "Диета",
			value: sectors.dietSectorPercent,
			fillColor: "#1e40af", // Dark Blue
			strokeColor: "#1e3a8a",
			descriptionRu: "Частота и содержание ферментируемых углеводов",
		},
		{
			id: "bacteriaSectorPercent",
			nameRu: "Бактерии",
			value: sectors.bacteriaSectorPercent,
			fillColor: "#ef4444", // Red
			strokeColor: "#b91c1c",
			descriptionRu: "Зубной налёт и колонизация S. mutans",
		},
		{
			id: "susceptibilitySectorPercent",
			nameRu: "Восприимчивость",
			value: sectors.susceptibilitySectorPercent,
			fillColor: "#0284c7", // Light Blue
			strokeColor: "#0369a1",
			descriptionRu: "Фторпрофилактика, буферная емкость и секреция слюны",
		},
		{
			id: "circumstancesSectorPercent",
			nameRu: "Анамнез и факторы",
			value: sectors.circumstancesSectorPercent,
			fillColor: "#eab308", // Yellow
			strokeColor: "#a16207",
			descriptionRu: "Опыт кариеса (КПУ) и соматический статус",
		},
	];

	const slices: CariogramPieSlice[] = [];
	let currentAngle = -Math.PI / 2; // Start from 12 o'clock

	const totalValue = sectorConfig.reduce((acc, s) => acc + s.value, 0);
	const normalizedTotal = totalValue > 0 ? totalValue : 100;

	for (const sec of sectorConfig) {
		const sliceFraction = sec.value / normalizedTotal;
		const sliceAngle = sliceFraction * 2 * Math.PI;
		const startAngle = currentAngle;
		const endAngle = currentAngle + sliceAngle;
		currentAngle = endAngle;

		if (sliceFraction <= 0.0001) {
			continue;
		}

		// Full circle special case
		let path = "";
		if (sliceFraction >= 0.9999) {
			path = `M ${center.x} ${center.y - radius} A ${radius} ${radius} 0 1 1 ${center.x} ${center.y + radius} A ${radius} ${radius} 0 1 1 ${center.x} ${center.y - radius} Z`;
		} else {
			const x1 = center.x + radius * Math.cos(startAngle);
			const y1 = center.y + radius * Math.sin(startAngle);
			const x2 = center.x + radius * Math.cos(endAngle);
			const y2 = center.y + radius * Math.sin(endAngle);
			const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

			if (innerRadius > 0) {
				const ix1 = center.x + innerRadius * Math.cos(endAngle);
				const iy1 = center.y + innerRadius * Math.sin(endAngle);
				const ix2 = center.x + innerRadius * Math.cos(startAngle);
				const iy2 = center.y + innerRadius * Math.sin(startAngle);
				path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2} Z`;
			} else {
				path = `M ${center.x} ${center.y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
			}
		}

		slices.push({
			id: sec.id,
			nameRu: sec.nameRu,
			percentage: sec.value,
			startAngleRad: startAngle,
			endAngleRad: endAngle,
			pathData: path,
			fillColor: sec.fillColor,
			strokeColor: sec.strokeColor,
			descriptionRu: sec.descriptionRu,
		});
	}

	return slices;
}

/**
 * Returns tooth category type for layout and filtering.
 */
export function getToothDentitionType(
	toothNumber: number,
): "primary" | "permanent" | "mixed_first_molar" {
	if (isPrimaryTooth(toothNumber)) return "primary";
	if ([16, 26, 36, 46].includes(toothNumber)) return "mixed_first_molar";
	return "permanent";
}
