/**
 * DENTE Dental CRM — Anatomical Keyboard Navigation & Hotkeys Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useEffect } from "react";
import type { OdontogramQuadrantId, ToothData, ToothState } from "../ToothChart";
import { getQuadrantForTooth } from "../ToothChart";
import { getNextFocusedTooth, getToothStateFromHotkey } from "../ClassicGostOdontogram";

export function useAnatomicalKeyboardShortcuts(
	selectedTeeth: number[],
	onQuickStateChange: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined,
	isPediatricEffective: boolean,
	currentQuadrant: OdontogramQuadrantId,
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void,
	teethDataMap: Map<number, ToothData>,
) {
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
				return;
			}

			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					const singleTooth = selectedTeeth.length === 1 && selectedTeeth[0] !== undefined
						? teethDataMap.get(selectedTeeth[0])
						: undefined;
					onQuickStateChange(selectedTeeth, quickState, singleTooth?.surfaces);
					return;
				}
			}

			const firstTooth = selectedTeeth[0];
			if (selectedTeeth.length === 1 && firstTooth !== undefined) {
				const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
					ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Home: "home", End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, isPediatricEffective);
					if (currentQuadrant !== "all") {
						const nextQuad = getQuadrantForTooth(nextTooth, isPediatricEffective);
						if (nextQuad !== currentQuadrant) {
							handleSelectQuadrant(nextQuad);
						}
					}
					const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
					nextEl?.focus();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [selectedTeeth, onQuickStateChange, isPediatricEffective, currentQuadrant, handleSelectQuadrant, teethDataMap]);
}
