/**
 * useCbctStudioHotkeys.ts — обработка горячих клавиш клавиатуры, зумирование срезов и переключение резкости.
 */

import { useCallback, useEffect } from "react";
import type { CbctViewportType } from "../cbctMprMath";
import {
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "../cbctMprMath";
import { useCbctKeyboardShortcuts, applyStepZoom } from "../useCbctKeyboardShortcuts";
import { getSharedCbctGlContext } from "../mpr/webgl/CbctVolumeGlContext";
import { showToast } from "../../GlobalToast";
import type { useCbctStudioModalState } from "./useCbctStudioModalState";

export interface UseCbctStudioHotkeysProps {
	readonly isOpen: boolean;
	readonly state: ReturnType<typeof useCbctStudioModalState>;
	readonly onToggleMaximize: (viewport: CbctViewportType) => void;
	readonly onFullResetViewport: (viewport: CbctViewportType) => void;
	readonly onCloseStudio: () => void;
}

export function useCbctStudioHotkeys({
	isOpen,
	state,
	onToggleMaximize,
	onFullResetViewport,
	onCloseStudio,
}: UseCbctStudioHotkeysProps) {
	const handleToggleUnsharp = useCallback(() => {
		state.setIsUnsharpActive((prev) => {
			const next = !prev;
			try { getSharedCbctGlContext().setSharpenAmount(next ? 0.6 : 0.0); } catch { /* safe */ }
			showToast(next ? "Резкость трабекул: ВКЛ (SHARP ON)" : "Резкость: Исходный воксел (RAW VOXEL)", "info");
			return next;
		});
	}, [state]);

	useCbctKeyboardShortcuts({
		enabled: isOpen,
		activeViewport: state.activeViewport,
		setActiveViewport: state.setActiveViewport,
		isMaximized: state.maximizedViewport !== null,
		onRestoreMaximize: () => state.setMaximizedViewport(null),
		onToggleMaximize: () => onToggleMaximize(state.activeViewport),
		onScrollSlice: (direction, step) => {
			if (!state.volume) return;
			const delta = (direction === "next" ? 1 : -1) * step;
			state.setCrosshairMm((prev) => ({ ...prev, z: prev.z + delta * state.volume!.spacingMm.z }));
		},
		onZoom: (direction) => {
			state.setTransforms((prev) => ({
				...prev,
				[state.activeViewport]: applyStepZoom(prev[state.activeViewport] ?? DEFAULT_VIEWPORT_TRANSFORM, direction),
			}));
		},
		onResetTransform: () => onFullResetViewport(state.activeViewport),
		onSelectPreset: (preset) => {
			const id = preset === "bone" ? "bone_dense" : preset === "endo" ? "enamel_dentin" : "soft_tissue";
			state.setActivePreset(id);
			const p = CBCT_HOUNSFIELD_PRESETS.find((pr) => pr.id === id);
			if (p) {
				state.setWindowWidth(p.windowWidth);
				state.setWindowLevel(p.windowLevel);
			}
		},
		onToggleMode: () => state.setActiveTool((prev) => (prev === "ruler" ? "crosshair" : "ruler")),
		onTogglePanel: () => state.setIsSidebarOpen((prev) => !prev),
		onClose: onCloseStudio,
	});

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target && (e.target as HTMLElement).tagName && ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
			if ((e.target as HTMLElement)?.isContentEditable) return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
				e.preventDefault();
				state.setActiveTool((prev) => (prev === "ruler" ? "crosshair" : "ruler"));
			} else if (e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф") {
				e.preventDefault();
				state.setActiveTool((prev) => (prev === "angle" ? "crosshair" : "angle"));
			} else if (e.key === "u" || e.key === "U" || e.key === "г" || e.key === "Г") {
				e.preventDefault();
				handleToggleUnsharp();
			} else if (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") {
				e.preventDefault();
				state.setActiveTool((prev) => (prev === "nerve" ? "crosshair" : "nerve"));
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleToggleUnsharp, state]);

	return {
		handleToggleUnsharp,
	};
}
