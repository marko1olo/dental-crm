import { vec3 } from "gl-matrix";
import {
	classifyExtendedBoneDensity,
	type ExtendedMischClass,
	type MischClass,
} from "../../utils/dicom/boneQualityEngine";


import type { StoredImplant, WorldPoint3 } from "./ctPlanningPersistence";
import { worldTriple } from "./ctPlanningPersistence";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper";

export type { ExtendedMischClass };


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
import { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM } from "../radiology/implantSafetyEngine";
export { MANDIBULAR_NERVE_DANGER_THRESHOLD_MM };



export { classifyExtendedBoneDensity };


export function storedImplantsOf(implants: readonly ImplantData[]): StoredImplant[] {
	const out: StoredImplant[] = [];
	for (const implant of implants) {
		const startWorld = worldTriple(Array.from(implant.startWorld));
		const endWorld = worldTriple(Array.from(implant.endWorld));
		if (!startWorld || !endWorld) continue;
		out.push({
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld,
			endWorld,
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: implant.boneDensity.classification,
			},
			...(typeof implant.distanceToNerve === "number"
				? { distanceToNerve: implant.distanceToNerve }
				: {}),
			...(implant.systemId ? { systemId: implant.systemId } : {}),
			...(implant.brandName ? { brandName: implant.brandName } : {}),
			...(implant.lineName ? { lineName: implant.lineName } : {}),
			...(implant.platformCode ? { platformCode: implant.platformCode } : {}),
			...(implant.platformColor ? { platformColor: implant.platformColor } : {}),
		});
	}
	return out;
}

export function implantDataOf(stored: readonly StoredImplant[]): ImplantData[] {
	return stored.map((implant) => {
		const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
		return {
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld: vec3.fromValues(
				implant.startWorld[0],
				implant.startWorld[1],
				implant.startWorld[2],
			),
			endWorld: vec3.fromValues(
				implant.endWorld[0],
				implant.endWorld[1],
				implant.endWorld[2],
			),
			boneDensity: {
				averageHU: implant.boneDensity.averageHU,
				classification: densityInfo.mischClass,
				drillingAdvice: densityInfo.drillingRecommendation,
			},
			distanceToNerve: implant.distanceToNerve ?? null,
			systemId: implant.systemId,
			brandName: implant.brandName,
			lineName: implant.lineName,
			platformCode: implant.platformCode,
			platformColor: implant.platformColor,
		};
	});
}

export function implantProtocolLog(implant: ImplantData): string {
	const isDanger =
		implant.distanceToNerve != null &&
		implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;
	const nerveStatusText =
		implant.distanceToNerve != null
			? isDanger
				? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска травматизации сосудисто-нервного пучка!`
				: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`
			: "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.";

	const densityInfo = classifyExtendedBoneDensity(implant.boneDensity.averageHU);
	const brandTitle = implant.brandName
		? `${implant.brandName} ${implant.lineName ?? ""}`.trim()
		: "Дентальный имплантат";
	const platformText = implant.platformCode ? ` (Платформа ${implant.platformCode})` : "";

	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${brandTitle} Ø${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм${platformText}. Плотность кости: ${densityInfo.label} (${Math.round(implant.boneDensity.averageHU)} HU). Протокол препарирования: ${densityInfo.drillingRecommendation}. ${nerveStatusText}`;
}

export const VIEWPORT_IDS = {
	axial: "AXIAL",
	sagittal: "SAGITTAL",
	coronal: "CORONAL",
} as const;

export { teardownViewportCanvases };
