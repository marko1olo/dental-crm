/**
 * usePerioKeypadActions.ts — Действия шагов зондирования, цифровой клавиатуры и переключения маркеров.
 * Архитектурный слой Layer 3: Hook (Мандат 8b, <= 120 строк).
 */

import { isFurcationEligibleTooth, type PerioSiteKey, type PerioToothRecord, type ProbingStep } from "@dental/shared";
import { useCallback } from "react";

export interface UsePerioKeypadActionsOptions {
	readonly readOnly: boolean;
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly selectedToothNumber: number;
	readonly probingSequence: readonly ProbingStep[];
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly setFocusedSite: (site: { toothNumber: number; siteKey: PerioSiteKey } | null) => void;
	readonly setSelectedToothNumber: (num: number) => void;
	readonly updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void;
	readonly updateToothProperties: (toothNumber: number, patch: Partial<Pick<PerioToothRecord, "mobility" | "furcation">>) => void;
}

export function usePerioKeypadActions({
	readOnly, focusedSite, selectedToothNumber, probingSequence, toothMap,
	setFocusedSite, setSelectedToothNumber, updateToothSite, updateToothProperties,
}: UsePerioKeypadActionsOptions) {
	const moveToNextSite = useCallback(() => {
		if (!focusedSite) {
			if (probingSequence.length > 0) {
				const f = probingSequence[0]!;
				setFocusedSite({ toothNumber: f.toothNumber, siteKey: f.siteKey });
				setSelectedToothNumber(f.toothNumber);
			}
			return;
		}
		const idx = probingSequence.findIndex((s) => s.toothNumber === focusedSite.toothNumber && s.siteKey === focusedSite.siteKey);
		if (idx >= 0 && idx < probingSequence.length - 1) {
			const n = probingSequence[idx + 1]!;
			setFocusedSite({ toothNumber: n.toothNumber, siteKey: n.siteKey });
			setSelectedToothNumber(n.toothNumber);
		} else if (probingSequence.length > 0) {
			const f = probingSequence[0]!;
			setFocusedSite({ toothNumber: f.toothNumber, siteKey: f.siteKey });
			setSelectedToothNumber(f.toothNumber);
		}
	}, [focusedSite, probingSequence, setFocusedSite, setSelectedToothNumber]);

	const moveToPreviousSite = useCallback(() => {
		if (!focusedSite) return;
		const idx = probingSequence.findIndex((s) => s.toothNumber === focusedSite.toothNumber && s.siteKey === focusedSite.siteKey);
		if (idx > 0) {
			const p = probingSequence[idx - 1]!;
			setFocusedSite({ toothNumber: p.toothNumber, siteKey: p.siteKey });
			setSelectedToothNumber(p.toothNumber);
		}
	}, [focusedSite, probingSequence, setFocusedSite, setSelectedToothNumber]);

	const handleKeypadDepth = useCallback((depth: number) => {
		if (readOnly) return;
		let target = focusedSite;
		if (!target) {
			if (!probingSequence.length) return;
			target = { toothNumber: probingSequence[0]!.toothNumber, siteKey: probingSequence[0]!.siteKey };
			setFocusedSite(target);
			setSelectedToothNumber(target.toothNumber);
		}
		updateToothSite(target.toothNumber, target.siteKey, () => ({ probingDepthMm: depth }));
		moveToNextSite();
	}, [readOnly, focusedSite, probingSequence, updateToothSite, moveToNextSite, setFocusedSite, setSelectedToothNumber]);

	const handleKeypadGingivalMargin = useCallback((delta: number) => {
		if (readOnly || !focusedSite) return;
		updateToothSite(focusedSite.toothNumber, focusedSite.siteKey, (p) => ({ gingivalMarginMm: (p.gingivalMarginMm ?? 0) + delta }));
	}, [readOnly, focusedSite, updateToothSite]);

	const getTargetSite = useCallback(() => {
		if (focusedSite) return focusedSite;
		const num = selectedToothNumber || probingSequence[0]?.toothNumber || 16;
		const key = probingSequence[0]?.siteKey || "midBuccal";
		const t = { toothNumber: num, siteKey: key };
		setFocusedSite(t);
		setSelectedToothNumber(num);
		return t;
	}, [focusedSite, selectedToothNumber, probingSequence, setFocusedSite, setSelectedToothNumber]);

	const handleKeypadToggleBop = useCallback(() => {
		if (readOnly) return;
		const t = getTargetSite();
		updateToothSite(t.toothNumber, t.siteKey, (p) => ({ bleedingOnProbing: !p.bleedingOnProbing }));
	}, [readOnly, getTargetSite, updateToothSite]);

	const handleKeypadTogglePlaque = useCallback(() => {
		if (readOnly) return;
		const t = getTargetSite();
		updateToothSite(t.toothNumber, t.siteKey, (p) => ({ plaque: !p.plaque }));
	}, [readOnly, getTargetSite, updateToothSite]);

	const handleKeypadToggleSuppuration = useCallback(() => {
		if (readOnly) return;
		const t = getTargetSite();
		updateToothSite(t.toothNumber, t.siteKey, (p) => ({ suppuration: !p.suppuration }));
	}, [readOnly, getTargetSite, updateToothSite]);

	const handleCycleMobility = useCallback((num: number) => {
		if (readOnly) return;
		const curr = toothMap.get(num)?.mobility ?? 0;
		updateToothProperties(num, { mobility: ((curr + 1) % 4) as 0 | 1 | 2 | 3 });
	}, [readOnly, toothMap, updateToothProperties]);

	const handleCycleFurcation = useCallback((num: number) => {
		if (readOnly || !isFurcationEligibleTooth(num)) return;
		const curr = toothMap.get(num)?.furcation ?? 0;
		updateToothProperties(num, { furcation: ((curr + 1) % 5) as 0 | 1 | 2 | 3 | 4 });
	}, [readOnly, toothMap, updateToothProperties]);

	return {
		moveToNextSite, moveToPreviousSite, handleKeypadDepth, handleKeypadGingivalMargin,
		handleKeypadToggleBop, handleKeypadTogglePlaque, handleKeypadToggleSuppuration,
		handleCycleMobility, handleCycleFurcation,
	};
}
