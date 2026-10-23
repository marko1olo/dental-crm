/**
 * DENTE Dental CRM — 32-Tooth Gate 0 Full Arch Mockup Types
 * Mandate 8b <= 120 lines.
 */

export type BadgeSizeId = "s" | "m" | "l" | "xl" | "xxl";
export type BadgeSizeOption = BadgeSizeId | "compare";
export type BadgePlacement = "root_apex" | "occlusal";

export interface BadgeSizeConfig {
	readonly id: BadgeSizeId;
	readonly label: string;
	readonly radius: number; // in tooth SVG units
	readonly pixelDiameter: number; // for standalone circles
	readonly description: string;
}

export const BADGE_SIZE_CONFIGS: Record<BadgeSizeId, BadgeSizeConfig> = {
	s: {
		id: "s",
		label: "S (18px)",
		radius: 8.5,
		pixelDiameter: 18,
		description: "Компактный кружок R=8.5 (18px)",
	},
	m: {
		id: "m",
		label: "M (22px)",
		radius: 11,
		pixelDiameter: 22,
		description: "Стандартный кружок R=11 (22px)",
	},
	l: {
		id: "l",
		label: "L (27px)",
		radius: 13.5,
		pixelDiameter: 27,
		description: "Увеличенный кружок R=13.5 (27px)",
	},
	xl: {
		id: "xl",
		label: "XL (32px)",
		radius: 16,
		pixelDiameter: 32,
		description: "Большой четкий кружок R=16 (32px)",
	},
	xxl: {
		id: "xxl",
		label: "XXL (37px)",
		radius: 18.5,
		pixelDiameter: 37,
		description: "Максимальный кружок R=18.5 (37px)",
	},
};

export interface MockupToothItem {
	readonly toothNumber: number;
	readonly presetId: string;
	readonly isUpper: boolean;
	readonly quadrant: 1 | 2 | 3 | 4;
}

export function getEffectiveBadgeRadius(
	sizeOption: BadgeSizeOption,
	quadrant: 1 | 2 | 3 | 4,
): number {
	if (sizeOption === "compare") {
		// Quadrant-based comparative distribution
		if (quadrant === 1) return BADGE_SIZE_CONFIGS.s.radius;
		if (quadrant === 2) return BADGE_SIZE_CONFIGS.m.radius;
		if (quadrant === 4) return BADGE_SIZE_CONFIGS.l.radius;
		return BADGE_SIZE_CONFIGS.xl.radius;
	}
	return BADGE_SIZE_CONFIGS[sizeOption].radius;
}
