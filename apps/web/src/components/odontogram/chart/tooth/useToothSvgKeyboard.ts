import type React from "react";
import { useCallback } from "react";
import {
	type ToothState,
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../toothChartTypes";

export interface ToothSvgKeyboardOptions {
	number: number;
	state: ToothState;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	pediatricMode?: boolean | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
}

export function useToothSvgKeyboard({
	number,
	state,
	surfaces,
	useSurfaces,
	selectedTeeth,
	pediatricMode,
	onQuickStateChange,
}: ToothSvgKeyboardOptions) {
	return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];

		// 1. Space: Fast toggle Healthy <-> Caries
		if (e.key === " " || e.code === "Space") {
			e.preventDefault();
			if (onQuickStateChange) {
				const nextState: ToothState = state === "Caries" ? "Healthy" : "Caries";
				const nextSurfaces = nextState === "Healthy" ? [] : surfaces && surfaces.length > 0 ? surfaces : [];
				onQuickStateChange(targets, nextState, nextSurfaces);
			}
			return;
		}

		// 2. Enter: Confirm and advance focus to next tooth
		if (e.key === "Enter") {
			e.preventDefault();
			const nextTooth = getNextFocusedTooth(number, "right", pediatricMode);
			document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`)?.focus();
			return;
		}

		// 3. Arrow keys navigation (Left/Right/Up/Down/Home/End)
		const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
			ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Home: "home", End: "end",
		};
		if (dirMap[e.key]) {
			e.preventDefault();
			const nextTooth = getNextFocusedTooth(number, dirMap[e.key]!, pediatricMode);
			document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`)?.focus();
			return;
		}

		// 4. Number keys 1..5 / Numpad 1..5 for surfaces (O, M, D, V, L)
		const surfaceMap: Record<string, string> = {
			"1": "O", "2": "M", "3": "D", "4": "V", "5": "L",
			Numpad1: "O", Numpad2: "M", Numpad3: "D", Numpad4: "V", Numpad5: "L",
		};
		const surfaceToToggle = surfaceMap[e.key] || surfaceMap[e.code];
		if (surfaceToToggle && onQuickStateChange) {
			e.preventDefault();
			const currSurfaces = surfaces ?? [];
			const nextSurfaces = currSurfaces.includes(surfaceToToggle)
				? currSurfaces.filter((s) => s !== surfaceToToggle)
				: [...currSurfaces, surfaceToToggle];
			const nextState: ToothState = nextSurfaces.length > 0
				? (state === "Healthy" ? "Caries" : state)
				: (state === "Caries" ? "Healthy" : state);
			onQuickStateChange(targets, nextState, nextSurfaces);
			return;
		}

		// 5. 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
		const quickState = getToothStateFromHotkey(e.key);
		if (quickState && onQuickStateChange) {
			e.preventDefault();
			const isWholeToothState = quickState === "Healthy" || quickState === "Missing" || quickState === "Crown" || quickState === "Implant";
			const effectiveSurfaces = isWholeToothState
				? (quickState === "Healthy" || quickState === "Missing" ? [] : undefined)
				: (useSurfaces ? surfaces : undefined);
			onQuickStateChange(targets, quickState, effectiveSurfaces);
		}
	}, [number, state, surfaces, useSurfaces, selectedTeeth, pediatricMode, onQuickStateChange]);
}
