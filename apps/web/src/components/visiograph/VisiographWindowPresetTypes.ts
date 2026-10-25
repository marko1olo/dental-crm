/**
 * VisiographWindowPresetTypes.ts
 * Type definitions and range computation for Visiograph window presets.
 */

export type VisiographPresetId =
	| "bone"
	| "enamel_dentin"
	| "soft_tissue"
	| "endodontic_canal"
	| "airway"
	| "skull"
	| "endoscopy"
	| "soft_tissue_bone";

export interface VisiographWindowPreset {
	id: VisiographPresetId;
	label: string;
	shortLabel: string;
	icon: string;
	description: string;
	windowWidth: number;
	windowCenter: number;
	voiRange: {
		lower: number;
		upper: number;
	};
}

/**
 * Computes VOI (Value of Interest) window range from window width (WW) and window level (WL).
 */
export function computeVoiRange(
	windowWidth: number,
	windowCenter: number,
): { lower: number; upper: number } {
	const halfWidth = windowWidth / 2;
	return {
		lower: windowCenter - halfWidth,
		upper: windowCenter + halfWidth,
	};
}
