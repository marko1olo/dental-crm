/**
 * perioKeyboardDepth.ts — Обработка цифрового ввода зондирования (0..9, Shift+1=11мм, Shift+2=12мм).
 * Архитектурный слой Layer 3: Keyboard Sub-engine (Мандат 8b, <= 120 строк).
 */

import type { PerioSiteKey, PerioToothRecord, ProbingStep } from "@dental/shared";
import type React from "react";

export function handlePerioKeyboardShiftDigits(
	e: React.KeyboardEvent<HTMLDivElement>,
	activeSite: { toothNumber: number; siteKey: PerioSiteKey },
	updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void,
	moveToNextSite: () => void,
): boolean {
	const isShift11 = e.shiftKey && (e.code === "Digit1" || e.code === "Numpad1" || e.key === "!" || e.key === "1");
	const isShift12 = e.shiftKey && (e.code === "Digit2" || e.code === "Numpad2" || e.key === "@" || e.key === '"' || e.key === "2");

	if (!isShift11 && !isShift12) return false;

	e.preventDefault();
	const depth = isShift11 ? 11 : 12;
	updateToothSite(activeSite.toothNumber, activeSite.siteKey, () => ({ probingDepthMm: depth }));
	moveToNextSite();
	return true;
}

export function handlePerioKeyboardDigit(
	e: React.KeyboardEvent<HTMLDivElement>,
	activeSite: { toothNumber: number; siteKey: PerioSiteKey },
	updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void,
	moveToNextSite: () => void,
): boolean {
	const isNumpadOrDigit = !e.shiftKey && (/^[0-9]$/.test(e.key) || /^Numpad[0-9]$/.test(e.code));
	if (!isNumpadOrDigit) return false;

	e.preventDefault();
	const rawChar = /^[0-9]$/.test(e.key) ? e.key : e.code.replace("Numpad", "");
	const num = Number.parseInt(rawChar, 10);
	const depth = num === 0 ? 10 : num;

	updateToothSite(activeSite.toothNumber, activeSite.siteKey, () => ({ probingDepthMm: depth }));
	moveToNextSite();
	return true;
}

export function handlePerioKeyboardDepth(
	e: React.KeyboardEvent<HTMLDivElement>,
	focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null,
	probingSequence: readonly ProbingStep[],
	updateToothSite: (toothNumber: number, siteKey: PerioSiteKey, updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void,
	moveToNextSite: () => void,
	setFocusedSite: (site: { toothNumber: number; siteKey: PerioSiteKey } | null) => void,
	setSelectedToothNumber: (toothNumber: number) => void,
): boolean {
	let target = focusedSite;
	if (!target && probingSequence.length > 0) {
		target = { toothNumber: probingSequence[0]!.toothNumber, siteKey: probingSequence[0]!.siteKey };
		setFocusedSite(target);
		setSelectedToothNumber(target.toothNumber);
	}
	if (!target) return false;

	return handlePerioKeyboardShiftDigits(e, target, updateToothSite, moveToNextSite) ||
		handlePerioKeyboardDigit(e, target, updateToothSite, moveToNextSite);
}
