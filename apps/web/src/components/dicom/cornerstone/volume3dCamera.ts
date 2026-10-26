/**
 * volume3dCamera.ts — Управление 3D камерой и пресетами Volume3D (Мандат 8b <= 120 строк).
 */

import * as cornerstone from "@cornerstonejs/core";
import { logger } from "../../../utils/logger";

export function applyVolume3DPreset(viewport: any, presetInput: string | Record<string, any>): boolean {
	if (!viewport) return false;
	try {
		if (typeof viewport.setProperties === "function") {
			viewport.setProperties({ preset: presetInput });
			if (typeof viewport.render === "function") viewport.render();
			return true;
		}
	} catch (err) {
		logger.warn("[applyVolume3DPreset] Could not apply preset to volume3d:", err);
	}
	return false;
}

export function resetVolume3DCamera(viewport: any): boolean {
	if (!viewport) return false;
	try {
		if (typeof viewport.resetCamera === "function") {
			viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true });
			if (typeof viewport.render === "function") viewport.render();
			return true;
		}
	} catch (err) {
		logger.warn("[resetVolume3DCamera] Failed to reset 3D camera:", err);
	}
	return false;
}

export function setVolume3DOrientation(viewport: any, orientation: "axial" | "sagittal" | "coronal"): boolean {
	if (!viewport) return false;
	try {
		const map: Record<string, any> = {
			axial: cornerstone.Enums.OrientationAxis.AXIAL,
			sagittal: cornerstone.Enums.OrientationAxis.SAGITTAL,
			coronal: cornerstone.Enums.OrientationAxis.CORONAL,
		};
		const target = map[orientation];
		if (target && typeof viewport.applyViewOrientation === "function") {
			viewport.applyViewOrientation(target);
			if (typeof viewport.render === "function") viewport.render();
			return true;
		}
	} catch (err) {
		logger.warn("[setVolume3DOrientation] Failed to set orientation:", err);
	}
	return false;
}
