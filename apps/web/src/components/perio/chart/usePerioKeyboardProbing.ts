/**
 * apps/web/src/components/perio/chart/usePerioKeyboardProbing.ts
 *
 * Фасадный хук горячих клавиш зондирования (Мандат 8b, <= 120 строк).
 */

import type { PerioSiteKey, PerioToothRecord, ProbingStep } from "@dental/shared";
import { useCallback } from "react";
import { handlePerioKeyboardDigit, handlePerioKeyboardShiftDigits } from "./perioKeyboardDepth";
import { handlePerioKeyboardStep, handlePerioKeyboardToggles } from "./perioKeyboardToggles";

export interface UsePerioKeyboardProbingOptions {
	readonly readOnly: boolean;
	readonly isProbeKeyboardEnabled: boolean;
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly probingSequence: readonly ProbingStep[];
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void;
	readonly updateToothProperties: (toothNumber: number, patch: Partial<Pick<PerioToothRecord, "mobility" | "furcation">>) => void;
	readonly moveToNextSite: () => void;
	readonly moveToPreviousSite: () => void;
	readonly setFocusedSite: (site: { toothNumber: number; siteKey: PerioSiteKey } | null) => void;
	readonly setSelectedToothNumber: (toothNumber: number) => void;
	readonly onSetAllIntact?: (() => void) | undefined;
}

export function usePerioKeyboardProbing({
	readOnly, isProbeKeyboardEnabled, focusedSite, probingSequence, toothMap,
	updateToothSite, updateToothProperties, moveToNextSite, moveToPreviousSite,
	setFocusedSite, setSelectedToothNumber, onSetAllIntact,
}: UsePerioKeyboardProbingOptions) {
	return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if (readOnly || !isProbeKeyboardEnabled) return;
		const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
		if (targetTag === "input" || targetTag === "textarea") return;

		if (e.key === "N" && (e.ctrlKey || e.metaKey || e.shiftKey)) {
			e.preventDefault(); e.stopPropagation(); onSetAllIntact?.(); return;
		}

		if (["ArrowRight", "Tab", "Enter"].includes(e.key) && !e.shiftKey) {
			e.preventDefault(); e.stopPropagation(); moveToNextSite(); return;
		}
		if (["ArrowLeft"].includes(e.key) || (e.key === "Tab" && e.shiftKey)) {
			e.preventDefault(); e.stopPropagation(); moveToPreviousSite(); return;
		}

		let activeSite = focusedSite;
		if (!activeSite && probingSequence.length > 0) {
			activeSite = { toothNumber: probingSequence[0]!.toothNumber, siteKey: probingSequence[0]!.siteKey };
			setFocusedSite(activeSite); setSelectedToothNumber(activeSite.toothNumber);
		}
		if (!activeSite) return;

		const currentTooth = toothMap.get(activeSite.toothNumber);
		const currentSite = currentTooth ? currentTooth[activeSite.siteKey] : null;

		if (handlePerioKeyboardDigit(e, activeSite, updateToothSite, moveToNextSite)) return;
		if (handlePerioKeyboardShiftDigits(e, activeSite, updateToothSite, moveToNextSite)) return;
		if (handlePerioKeyboardToggles(e, activeSite, currentTooth, updateToothSite, updateToothProperties)) return;
		if (handlePerioKeyboardStep(e, activeSite, currentSite, updateToothSite)) return;
	}, [readOnly, isProbeKeyboardEnabled, focusedSite, probingSequence, toothMap, updateToothSite, updateToothProperties, moveToNextSite, moveToPreviousSite, setFocusedSite, setSelectedToothNumber, onSetAllIntact]);
}
