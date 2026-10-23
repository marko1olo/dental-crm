/**
 * perioKeyboardToggles.ts — Обработчики клавиш патологий пародонта (BOP, Plaque, Pus, Calculus, Miller, Hamp).
 * Архитектурный слой Layer 3: Keyboard Sub-engine (Мандат 8b, <= 120 строк).
 */

import { isFurcationEligibleTooth, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import type React from "react";

export function handlePerioKeyboardToggles(
	e: React.KeyboardEvent<HTMLDivElement>,
	toothNumber: number,
	siteKey: PerioSiteKey,
	toothMap: Map<number, PerioToothRecord>,
	updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void,
	updateToothProperties: (toothNumber: number, patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>) => void,
): boolean {
	if (e.key === "+" || e.code === "NumpadAdd") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ probingDepthMm: Math.min(15, (prev.probingDepthMm ?? 0) + 1) }));
		return true;
	}
	if (e.key === "-" || e.code === "NumpadSubtract") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ probingDepthMm: Math.max(0, (prev.probingDepthMm ?? 0) - 1) }));
		return true;
	}
	if (e.key === " " || e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ bleedingOnProbing: !prev.bleedingOnProbing }));
		return true;
	}
	if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ plaque: !prev.plaque }));
		return true;
	}
	if (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ suppuration: !prev.suppuration }));
		return true;
	}
	if (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") {
		e.preventDefault();
		updateToothSite(toothNumber, siteKey, (prev) => ({ calculus: !prev.calculus }));
		return true;
	}
	if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
		e.preventDefault();
		const cur = toothMap.get(toothNumber)?.mobility ?? 0;
		updateToothProperties(toothNumber, { mobility: ((cur + 1) % 4) as 0 | 1 | 2 | 3 });
		return true;
	}
	if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
		e.preventDefault();
		if (isFurcationEligibleTooth(toothNumber)) {
			const cur = toothMap.get(toothNumber)?.furcation ?? 0;
			updateToothProperties(toothNumber, { furcation: ((cur + 1) % 5) as 0 | 1 | 2 | 3 | 4 });
		}
		return true;
	}
	return false;
}

export function handlePerioKeyboardStep(
	e: React.KeyboardEvent<HTMLDivElement>,
	activeSite: { toothNumber: number; siteKey: PerioSiteKey },
	_currentSite: unknown,
	updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void,
): boolean {
	if (e.key === "ArrowUp") {
		e.preventDefault();
		updateToothSite(activeSite.toothNumber, activeSite.siteKey, (prev) => ({
			probingDepthMm: Math.min(15, (prev?.probingDepthMm ?? 0) + 1),
		}));
		return true;
	}
	if (e.key === "ArrowDown") {
		e.preventDefault();
		updateToothSite(activeSite.toothNumber, activeSite.siteKey, (prev) => ({
			probingDepthMm: Math.max(0, (prev?.probingDepthMm ?? 0) - 1),
		}));
		return true;
	}
	return false;
}
