/**
 * cornerstoneTypes.ts — Типы данных и константы интеграции Cornerstone3D
 * Mandate 8b: строго <= 120 строк.
 */

import type { vec3 } from "gl-matrix";
import {
	classifyExtendedBoneDensity,
	type ExtendedMischClass,
} from "../../utils/dicom/boneQualityEngine.js";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper.js";
import { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM } from "../radiology/implantSafetyEngine.js";

export type { ExtendedMischClass };
export { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM, classifyExtendedBoneDensity, teardownViewportCanvases };
export {
	storedImplantsOf,
	implantDataOf,
	implantProtocolLog,
} from "./cornerstone/implantDataConverters.js";

export interface ImplantData {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: vec3;
	endWorld: vec3;
	boneDensity: {
		averageHU: number;
		classification: ExtendedMischClass;
		drillingAdvice?: string;
		corticalHU?: number;
		cancellousHU?: number;
		apicalHU?: number;
	};
	distanceToNerve?: number | null;
	systemId?: string | undefined;
	brandName?: string | undefined;
	lineName?: string | undefined;
	platformCode?: string | undefined;
	platformColor?: string | undefined;
}

export interface Cornerstone3DViewerProps {
	imageIds: string[];
	patientId?: string | null | undefined;
	patientName?: string | undefined;
	studyDate?: string | undefined;
	voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number } | undefined;
	authHeaders?: Record<string, string> | undefined;
	onClose?: (() => void) | undefined;
}

export const MARKUP_SAVE_DEBOUNCE_MS = 1500;

export const VIEWPORT_IDS = {
	axial: "AXIAL",
	sagittal: "SAGITTAL",
	coronal: "CORONAL",
} as const;
