/**
 * useCornerstoneKeyboardShortcuts.ts — Горячие клавиши для Cornerstone 3D MPR просмотрщика
 * Mandate 8b: строго <= 120 строк.
 */

import { useEffect } from "react";
import { type VisiographPresetId, VISIOGRAPH_WINDOW_PRESETS } from "./VisiographWindowPresets.js";
import {
	KEYBOARD_PRESET_MAP, isTypingInInputElement,
	resetCornerstoneViewports, adjustCornerstoneZoom,
} from "./cornerstone/keyboardShortcutHelpers.js";

export { KEYBOARD_PRESET_MAP, isTypingInInputElement };

export interface CornerstoneKeyboardShortcutOptions {
	renderingEngineId: string;
	onToggleInvert: () => void;
	onApplyPreset: (presetId: VisiographPresetId) => void;
	onReset?: () => void;
	enabled?: boolean;
}

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
			if (isTypingInInputElement(event.target)) return;
			if (event.ctrlKey || event.metaKey || event.altKey) return;

			const key = event.key;

			if (key in KEYBOARD_PRESET_MAP) {
				const presetId = KEYBOARD_PRESET_MAP[key];
				if (presetId && VISIOGRAPH_WINDOW_PRESETS[presetId]) {
					event.preventDefault();
					onApplyPreset(presetId);
					return;
				}
			}

			if (key.toLowerCase() === "i" || key.toLowerCase() === "ш") {
				event.preventDefault();
				onToggleInvert();
				return;
			}

			if (key.toLowerCase() === "r" || key.toLowerCase() === "к") {
				event.preventDefault();
				resetCornerstoneViewports(renderingEngineId);
				onReset?.();
				return;
			}

			if (key === "+" || key === "=" || event.code === "NumpadAdd") {
				event.preventDefault();
				adjustCornerstoneZoom(renderingEngineId, 1.15);
				return;
			}

			if (key === "-" || key === "_" || event.code === "NumpadSubtract") {
				event.preventDefault();
				adjustCornerstoneZoom(renderingEngineId, 0.85);
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled, renderingEngineId, onToggleInvert, onApplyPreset, onReset]);
}
