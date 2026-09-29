import { useEffect } from "react";
import * as cornerstone from "@cornerstonejs/core";
import {
	VIEWPORT_IDS,
} from "./cornerstoneTypes";
import {
	type VisiographPresetId,
	VISIOGRAPH_WINDOW_PRESETS,
} from "./VisiographWindowPresets";

export interface CornerstoneKeyboardShortcutOptions {
	renderingEngineId: string;
	onToggleInvert: () => void;
	onApplyPreset: (presetId: VisiographPresetId) => void;
	onReset?: () => void;
	enabled?: boolean;
}

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

/**
 * Checks if the keyboard event originated from a text input, textarea, or contentEditable element.
 */
export function isTypingInInputElement(target: EventTarget | null): boolean {
	if (!target || typeof target !== "object") return false;
	const el = target as { tagName?: unknown; isContentEditable?: unknown };
	if (typeof el.tagName === "string") {
		const tagName = el.tagName.toUpperCase();
		if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
			return true;
		}
	}
	return Boolean(el.isContentEditable);
}

/**
 * Keyboard shortcuts hook for Cornerstone3D 3D MPR Viewer:
 * - `+` / `=`: Zoom In
 * - `-` / `_`: Zoom Out
 * - `r` / `R`: Reset viewports (camera reset)
 * - `i` / `I`: Toggle color inversion
 * - `1`..`8`: Switch WL Windowing presets (1: Bone, 2: Teeth, 3: Soft Tissue, 4: Endo, 5: Airway, 6: Skull, 7: Endo 3D, 8: Tissue+Bone)
 */
export function useCornerstoneKeyboardShortcuts({
	renderingEngineId,
	onToggleInvert,
	onApplyPreset,
	onReset,
	enabled = true,
}: CornerstoneKeyboardShortcutOptions): void {
	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Do not intercept keystrokes if the user is typing in form controls
			if (isTypingInInputElement(event.target)) {
				return;
			}

			// Don't interfere with browser Ctrl+... shortcuts (except standard canvas keys)
			if (event.ctrlKey || event.metaKey || event.altKey) {
				return;
			}

			const key = event.key;

			// Presets 1..8
			if (key in KEYBOARD_PRESET_MAP) {
				const presetId = KEYBOARD_PRESET_MAP[key];
				if (presetId && VISIOGRAPH_WINDOW_PRESETS[presetId]) {
					event.preventDefault();
					onApplyPreset(presetId);
					return;
				}
			}

			// Invert: I / i / Russian Ш / ш
			if (key.toLowerCase() === "i" || key.toLowerCase() === "ш") {
				event.preventDefault();
				onToggleInvert();
				return;
			}

			// Reset: R / r / Russian К / к
			if (key.toLowerCase() === "r" || key.toLowerCase() === "к") {
				event.preventDefault();
				const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
				if (renderingEngine) {
					for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
						const vp = renderingEngine.getViewport(vId);
						if (vp && "resetCamera" in vp) {
							(vp as cornerstone.Types.IVolumeViewport).resetCamera();
							vp.render();
						}
					}
				}
				if (onReset) {
					onReset();
				}
				return;
			}

			// Zoom In: +, =, NumpadAdd
			if (key === "+" || key === "=" || event.code === "NumpadAdd") {
				event.preventDefault();
				const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
				if (renderingEngine) {
					for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
						const vp = renderingEngine.getViewport(vId);
						if (vp && "getZoom" in vp && "setZoom" in vp) {
							const currentZoom = (vp as any).getZoom?.() ?? 1;
							(vp as any).setZoom?.(currentZoom * 1.15);
							vp.render();
						}
					}
				}
				return;
			}

			// Zoom Out: -, _, NumpadSubtract
			if (key === "-" || key === "_" || event.code === "NumpadSubtract") {
				event.preventDefault();
				const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
				if (renderingEngine) {
					for (const vId of [VIEWPORT_IDS.axial, VIEWPORT_IDS.sagittal, VIEWPORT_IDS.coronal]) {
						const vp = renderingEngine.getViewport(vId);
						if (vp && "getZoom" in vp && "setZoom" in vp) {
							const currentZoom = (vp as any).getZoom?.() ?? 1;
							(vp as any).setZoom?.(Math.max(0.1, currentZoom * 0.85));
							vp.render();
						}
					}
				}
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [enabled, renderingEngineId, onToggleInvert, onApplyPreset, onReset]);
}
