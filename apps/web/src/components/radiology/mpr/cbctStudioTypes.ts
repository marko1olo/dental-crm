import type { Point3D, ViewportTransform, CbctViewportType } from "../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../cbctMprMath";
import type { RadiologyStudy } from "../types";

export type StudioMode = "diagnostic" | "implant" | "endo" | "tmj";
export type ViewLayoutMode = "mpr_3_view" | "quad_view" | "layout_1_plus_3";

export const DEFAULT_IAN_NERVE_POINTS: readonly Point3D[] = [
	{ x: -32.0, y: -2.0, z: 2.0 },
	{ x: -28.0, y: -15.0, z: -4.0 },
	{ x: -25.0, y: -28.0, z: -10.0 },
	{ x: -22.0, y: -40.0, z: -14.0 },
	{ x: -18.0, y: -46.0, z: -16.0 },
	{ x: 18.0, y: -46.0, z: -16.0 },
	{ x: 22.0, y: -40.0, z: -14.0 },
	{ x: 25.0, y: -28.0, z: -10.0 },
	{ x: 28.0, y: -15.0, z: -4.0 },
	{ x: 32.0, y: -2.0, z: 2.0 },
];

export function formatNerveNodesPlural(count: number): string {
	const abs = Math.abs(count);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 14) {
		return `${count} узлов`;
	}
	if (mod10 === 1) {
		return `${count} узел`;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return `${count} узла`;
	}
	return `${count} узлов`;
}

export const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpolyline points='21 3 21 8 16 8'/%3E%3C/svg%3E") 12 12, crosshair`;

import type { TreatmentPlanItem } from "../../treatment-plans/types";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";

export interface CbctMprImplantStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly onApplyToDiary043?: ((diaryText: string) => void) | undefined;
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly initialStudioMode?: StudioMode | undefined;
	readonly initialSidebarOpen?: boolean | undefined;
	readonly initialCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
}

export function getDefaultViewportTransforms(): Record<CbctViewportType, ViewportTransform> {
	return {
		axial: { ...DEFAULT_VIEWPORT_TRANSFORM },
		coronal: { ...DEFAULT_VIEWPORT_TRANSFORM },
		sagittal: { ...DEFAULT_VIEWPORT_TRANSFORM },
		panoramic: { ...DEFAULT_VIEWPORT_TRANSFORM },
		cross_section: { ...DEFAULT_VIEWPORT_TRANSFORM },
	};
}
