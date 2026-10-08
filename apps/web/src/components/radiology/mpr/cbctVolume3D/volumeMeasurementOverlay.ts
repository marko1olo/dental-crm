/**
 * DENTE CRM — CBCT 3D Implants & Measurement Overlays (Layer 2)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Cybermed OnDemand3D
 */

import { type AirwayAnalysisResult, analyzeAirwayVolume } from "../../cbctAirwayAnalysisMath";
import type { CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import type { Implant3DWorldProjection } from "../../implantSafetyEngine";
import {
	convertImplantWorldToVolume3DParam,
	generate4JawImplants,
	type Volume3DImplantParam,
	type Volume3DPresetId,
} from "../cbctVolume3DMath";
import { drawVolume3DOverlay } from "../cbctVolume3DOverlayRenderer";

export interface DeriveImplantsParams {
	readonly volume: CbctVoxelVolume | null;
	readonly implants3DWorld?: readonly Implant3DWorldProjection[] | undefined;
	readonly implant3DWorld?: Implant3DWorldProjection | null | undefined;
	readonly implantCountMode: "quad" | "single";
}

export function deriveActive3DImplants({
	volume,
	implants3DWorld,
	implant3DWorld,
	implantCountMode,
}: DeriveImplantsParams): Volume3DImplantParam[] {
	if (!volume) return [];
	let worldList: readonly Implant3DWorldProjection[] = [];
	if (implants3DWorld && implants3DWorld.length > 0) {
		worldList = implants3DWorld;
	} else if (implant3DWorld) {
		worldList = [implant3DWorld];
	}

	// Mandibular arch invariant: strictly filter out any non-mandibular implants (e.g. maxillary teeth < 30 or entry3D.z > 0)
	const safeMandibularWorld = worldList.filter(
		(w) =>
			(!w.targetToothFdi || w.targetToothFdi >= 30) &&
			(!w.entry3D || w.entry3D.z <= 0.5),
	);

	if (implantCountMode === "quad") {
		const quadWorld = generate4JawImplants(volume, null);
		return quadWorld.map((w) =>
			convertImplantWorldToVolume3DParam(w, volume),
		);
	} else if (
		safeMandibularWorld.length > 0 &&
		safeMandibularWorld[0]?.targetToothFdi === 46
	) {
		return [
			convertImplantWorldToVolume3DParam(safeMandibularWorld[0]!, volume),
		];
	} else {
		const quadWorld = generate4JawImplants(volume, null);
		return [convertImplantWorldToVolume3DParam(quadWorld[0]!, volume)];
	}
}

export function deriveAirwayAnalysis(
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId,
): AirwayAnalysisResult | null {
	if (
		activePreset === "airway" &&
		volume &&
		volume.data &&
		!volume.isDisposed
	) {
		return analyzeAirwayVolume(volume);
	}
	return null;
}

export interface RenderVolume3DOverlayOptions {
	readonly volume: CbctVoxelVolume;
	readonly yaw: number;
	readonly pitch: number;
	readonly zoom: number;
	readonly pan: { x: number; y: number };
	readonly width: number;
	readonly height: number;
	readonly nervePoints: readonly Point3D[];
	readonly interpolatedNerve3D: readonly Point3D[];
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly implantsList: readonly Implant3DWorldProjection[];
	readonly nerveAuditResult:
		| {
				readonly isDangerous: boolean;
				readonly isWarning: boolean;
				readonly netClearanceToCanalWallMm: number;
		  }
		| null
		| undefined;
}

export function renderVolume3DVectorOverlay(
	ctx: CanvasRenderingContext2D,
	options: RenderVolume3DOverlayOptions,
): void {
	drawVolume3DOverlay(ctx, options);
}
