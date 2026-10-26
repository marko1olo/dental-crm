/**
 * keyboardShortcutHelpers.ts — Хелперы обработки клавиатурных сокращений Cornerstone
 * Mandate 8b: строго <= 120 строк.
 */

import * as cornerstone from "@cornerstonejs/core";
import { VIEWPORT_IDS } from "../cornerstoneTypes.js";
import type { VisiographPresetId } from "../VisiographWindowPresets.js";

export const KEYBOARD_PRESET_MAP: Record<string, VisiographPresetId> = {
	"1": "bone",
	"2": "enamel_dentin",
	"3": "soft_tissue",
	"4": "endodontic_canal",
	"5": "airway",
	"6": "skull",
	"7": "endoscopy",
	"8": "soft_tissue_bone",
};

export function isTypingInInputElement(target: EventTarget | null): boolean {
	if (!target || typeof target !== "object") return false;
	const el = target as { tagName?: unknown; isContentEditable?: unknown };
	if (typeof el.tagName === "string") {
		const tagName = el.tagName.toUpperCase();
		if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
	}
	return Boolean(el.isContentEditable);
}

export function resetCornerstoneViewports(renderingEngineId: string): void {
	const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
	if (!renderingEngine) return;
	for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
		const vp = renderingEngine.getViewport(vId);
		if (vp && "resetCamera" in vp) {
			(vp as cornerstone.Types.IVolumeViewport).resetCamera();
			vp.render();
		}
	}
}

export function adjustCornerstoneZoom(renderingEngineId: string, factor: number): void {
	const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
	if (!renderingEngine) return;
	for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
		const vp = renderingEngine.getViewport(vId);
		if (vp && "getZoom" in vp && "setZoom" in vp) {
			const currentZoom = (vp as any).getZoom?.() ?? 1;
			(vp as any).setZoom?.(Math.max(0.1, currentZoom * factor));
			vp.render();
		}
	}
}
