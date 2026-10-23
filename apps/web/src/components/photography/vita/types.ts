/**
 * VITA Scale Colorimetry & Data Models
 */

export interface ColorRGB {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

export interface ColorLab {
	L: number; // 0-100 (Lightness)
	a: number; // -128 to +127 (Green to Red)
	b: number; // -128 to +127 (Blue to Yellow)
}

export type VitaSystemType = 'classical' | '3d_master';

export interface VitaShade {
	code: string;
	nameRu: string;
	system: VitaSystemType;
	rgb: ColorRGB;
	lab: ColorLab;
	hueGroup: 'A' | 'B' | 'C' | 'D' | 'L' | 'M' | 'R' | 'Bleach';
	valueRanking: number; // 1 (lightest) to N (darkest)
	chromaLevel: number; // 1 to 5
	descriptionRu: string;
}

export interface ShadeDeltaResult {
	beforeShade: VitaShade;
	afterShade: VitaShade;
	deltaE00: number; // CIEDE2000
	deltaE76: number; // CIE76
	deltaL: number; // after.L - before.L (positive = lighter / brighter)
	deltaC: number; // after.C - before.C (positive = more saturated, negative = whiter/less yellow)
	deltaH: number; // hue difference in degrees
	isLighter: boolean;
	isNoticeable: boolean; // deltaE00 >= 1.2 (clinical perceptible threshold)
	stepDelta: number; // value ranking steps difference
	lightnessImprovementRu: string;
	chromaChangeRu: string;
	clinicalSummaryRu: string;
}
