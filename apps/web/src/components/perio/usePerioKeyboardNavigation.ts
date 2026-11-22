/**
 * apps/web/src/components/perio/usePerioKeyboardNavigation.ts
 *
 * Клинический хук клавиатурной навигации и быстрого зондирования пародонта (Florida Probe):
 * - Клавиши 1..9, 10..15 мм (двузначный таймер ввода)
 * - Пробел: переключение кровоточивости (BOP)
 * - Tab / Shift+Tab: обход поверхностей зуба (DB, B, MB, DL, L, ML)
 * - Стрелки Влево/Вправо: переход между зубами зубного ряда
 * - Стрелки Вверх/Вниз: переключение вестибулярного/орального аспекта
 * Mandate 8b: File <= 150 lines.
 */

import { useCallback, useEffect, useRef } from "react";
import type { PerioToothRecord, ProbingStep } from "@dental/shared";
import { ALL_PERIO_TEETH, calculateClinicalAttachmentLevel } from "@dental/shared";
import { showToast } from "../GlobalToast";
import type { SiteKey } from "./perioCatalogData";

export interface UsePerioKeyboardNavigationOptions {
	readonly isOpen: boolean;
	readonly selectedToothNum: number;
	readonly selectedSiteKey: SiteKey;
	readonly probingSequence: readonly ProbingStep[];
	readonly setTeeth: React.Dispatch<React.SetStateAction<PerioToothRecord[]>>;
	readonly setSelectedToothNum: (toothNumber: number) => void;
	readonly setSelectedSiteKey: (siteKey: SiteKey) => void;
}

export function usePerioKeyboardNavigation({
	isOpen,
	selectedToothNum,
	selectedSiteKey,
	probingSequence,
	setTeeth,
	setSelectedToothNum,
	setSelectedSiteKey,
}: UsePerioKeyboardNavigationOptions) {
	const twoDigitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingOneRef = useRef<boolean>(false);

	const clearTimers = useCallback(() => {
		if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
		pendingOneRef.current = false;
	}, []);

	const handleUpdateDepth = useCallback((depth: number) => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, probingDepthMm: depth, calMm: calculateClinicalAttachmentLevel(depth, site.gingivalMarginMm || 0) } };
		}));

		// Анатомический обход дуги Florida Probe: непрерывный проход по всей челюсти
		if (probingSequence.length > 0) {
			const currIdx = probingSequence.findIndex((s) => s.toothNumber === selectedToothNum && s.siteKey === selectedSiteKey);
			if (currIdx >= 0 && currIdx < probingSequence.length - 1) {
				const nextStep = probingSequence[currIdx + 1];
				if (nextStep) { setSelectedToothNum(nextStep.toothNumber); setSelectedSiteKey(nextStep.siteKey as SiteKey); }
			} else if (currIdx === probingSequence.length - 1) {
				const firstStep = probingSequence[0];
				if (firstStep) { setSelectedToothNum(firstStep.toothNumber); setSelectedSiteKey(firstStep.siteKey as SiteKey); }
				showToast("✓ Полный анатомический цикл зондирования завершён", "success");
			}
		}
	}, [selectedToothNum, selectedSiteKey, probingSequence, setTeeth, setSelectedToothNum, setSelectedSiteKey]);

	const handleToggleBop = useCallback(() => {
		setTeeth((prev) => prev.map((t) => t.toothNumber !== selectedToothNum ? t : { ...t, [selectedSiteKey]: { ...(t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false }), bleedingOnProbing: !t[selectedSiteKey]?.bleedingOnProbing } }));
	}, [selectedToothNum, selectedSiteKey, setTeeth]);

	const handleTogglePlaque = useCallback(() => {
		setTeeth((prev) => prev.map((t) => t.toothNumber !== selectedToothNum ? t : { ...t, [selectedSiteKey]: { ...(t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false }), plaque: !t[selectedSiteKey]?.plaque } }));
	}, [selectedToothNum, selectedSiteKey, setTeeth]);

	const handleToggleSuppuration = useCallback(() => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, suppuration: !site.suppuration } };
		}));
	}, [selectedToothNum, selectedSiteKey, setTeeth]);

	const handleUpdateGingivalMargin = useCallback((gm: number) => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, gingivalMarginMm: gm, calMm: calculateClinicalAttachmentLevel(site.probingDepthMm ?? 2, gm) } };
		}));
	}, [selectedToothNum, selectedSiteKey, setTeeth]);

	const handleUpdateMobility = useCallback((mobility: 0 | 1 | 2 | 3) => {
		setTeeth((prev) => prev.map((t) => (t.toothNumber === selectedToothNum ? { ...t, mobility } : t)));
	}, [selectedToothNum, setTeeth]);

	const handleUpdateFurcation = useCallback((furcation: 0 | 1 | 2 | 3) => {
		setTeeth((prev) => prev.map((t) => (t.toothNumber === selectedToothNum ? { ...t, furcation } : t)));
	}, [selectedToothNum, setTeeth]);

	const handleNavigateSite = useCallback((direction: "next" | "prev") => {
		if (probingSequence.length === 0) return;
		const currIdx = probingSequence.findIndex((s) => s.toothNumber === selectedToothNum && s.siteKey === selectedSiteKey);
		const targetIdx = direction === "next" ? (currIdx >= 0 && currIdx < probingSequence.length - 1 ? currIdx + 1 : 0) : (currIdx > 0 ? currIdx - 1 : probingSequence.length - 1);
		const step = probingSequence[targetIdx];
		if (step) { setSelectedToothNum(step.toothNumber); setSelectedSiteKey(step.siteKey as SiteKey); }
	}, [selectedToothNum, selectedSiteKey, probingSequence, setSelectedToothNum, setSelectedSiteKey]);

	const handleNavigateTooth = useCallback((direction: "next" | "prev") => {
		const perioTeeth = ALL_PERIO_TEETH as readonly number[];
		const tIdx = perioTeeth.indexOf(selectedToothNum);
		const target = direction === "next" ? (tIdx >= 0 && tIdx < perioTeeth.length - 1 ? perioTeeth[tIdx + 1] : perioTeeth[0]) : (tIdx > 0 ? perioTeeth[tIdx - 1] : perioTeeth[perioTeeth.length - 1]);
		if (target !== undefined) setSelectedToothNum(target);
	}, [selectedToothNum, setSelectedToothNum]);

	const handleToggleJawAspect = useCallback(() => {
		const aspectMap: Record<SiteKey, SiteKey> = { distoBuccal: "distoLingual", midBuccal: "midLingual", mesioBuccal: "mesioLingual", distoLingual: "distoBuccal", midLingual: "midBuccal", mesioLingual: "mesioBuccal" };
		setSelectedSiteKey(aspectMap[selectedSiteKey] || selectedSiteKey);
	}, [selectedSiteKey, setSelectedSiteKey]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			if (pendingOneRef.current && e.key >= "0" && e.key <= "5") {
				e.preventDefault();
				if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
				pendingOneRef.current = false;
				handleUpdateDepth(10 + Number(e.key));
				return;
			}
			if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
			pendingOneRef.current = false;
			if (e.key === "1") {
				e.preventDefault();
				pendingOneRef.current = true;
				twoDigitTimerRef.current = setTimeout(() => { pendingOneRef.current = false; handleUpdateDepth(1); }, 650);
				return;
			}
			if (e.key === "0") { e.preventDefault(); handleUpdateDepth(0); }
			else if (e.key >= "2" && e.key <= "9") { e.preventDefault(); handleUpdateDepth(Number(e.key)); }
			else if (e.code === "Space" || e.key === " ") { e.preventDefault(); handleToggleBop(); }
			else if (e.key === "Tab") { e.preventDefault(); handleNavigateSite(e.shiftKey ? "prev" : "next"); }
			else if (e.key === "ArrowRight") { e.preventDefault(); handleNavigateTooth("next"); }
			else if (e.key === "ArrowLeft") { e.preventDefault(); handleNavigateTooth("prev"); }
			else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); handleToggleJawAspect(); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			if (twoDigitTimerRef.current) clearTimeout(twoDigitTimerRef.current);
		};
	}, [isOpen, handleUpdateDepth, handleToggleBop, handleNavigateSite, handleNavigateTooth, handleToggleJawAspect]);

	return {
		handleUpdateDepth,
		handleToggleBop,
		handleTogglePlaque,
		handleToggleSuppuration,
		handleUpdateGingivalMargin,
		handleUpdateMobility,
		handleUpdateFurcation,
		handleNavigateSite,
		handleNavigateTooth,
		handleToggleJawAspect,
		clearTimers,
	};
}
