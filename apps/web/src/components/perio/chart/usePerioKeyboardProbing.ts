import {
	isFurcationEligibleTooth,
	type PerioSiteKey,
	type PerioToothRecord,
	type ProbingStep,
} from "@dental/shared";
import React, { useCallback } from "react";

export interface UsePerioKeyboardProbingOptions {
	readonly readOnly?: boolean | undefined;
	readonly isProbeKeyboardEnabled: boolean;
	readonly focusedSite: {
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null;
	readonly probingSequence: readonly ProbingStep[];
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly updateToothSite: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		updater: (
			prev: PerioToothRecord[PerioSiteKey],
		) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
	readonly updateToothProperties: (
		toothNumber: number,
		patch: Partial<
			Pick<
				PerioToothRecord,
				"isMissing" | "isImplant" | "mobility" | "furcation"
			>
		>,
	) => void;
	readonly moveToNextSite: () => void;
	readonly moveToPreviousSite: () => void;
	readonly setFocusedSite: (
		site: { toothNumber: number; siteKey: PerioSiteKey } | null,
	) => void;
	readonly setSelectedToothNumber: (toothNumber: number) => void;
	readonly onSetAllIntact?: (() => void) | undefined;
}

export function usePerioKeyboardProbing({
	readOnly = false,
	isProbeKeyboardEnabled,
	focusedSite,
	probingSequence,
	toothMap,
	updateToothSite,
	updateToothProperties,
	moveToNextSite,
	moveToPreviousSite,
	setFocusedSite,
	setSelectedToothNumber,
	onSetAllIntact,
}: UsePerioKeyboardProbingOptions) {
	return useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (readOnly || !isProbeKeyboardEnabled) return;

			// If focus is inside a standard text input, do not hijack typing
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			// 1-Click Fast Healthy Norm Hotkey: Shift+N or Alt+N (Doctor Autonomy)
			if (
				(e.key === "N" || e.key === "n" || e.key === "Т" || e.key === "т") &&
				(e.shiftKey || e.altKey)
			) {
				if (onSetAllIntact) {
					e.preventDefault();
					onSetAllIntact();
					return;
				}
			}

			// Dedicated Florida Probe 11 & 12 mm hotkeys: Shift+1 (11 mm), Shift+2 (12 mm)
			const isShift11 =
				e.shiftKey &&
				(e.code === "Digit1" || e.code === "Numpad1" || e.key === "!" || e.key === "1");
			const isShift12 =
				e.shiftKey &&
				(e.code === "Digit2" ||
					e.code === "Numpad2" ||
					e.key === "@" ||
					e.key === '"' ||
					e.key === "2");

			if (isShift11 || isShift12) {
				e.preventDefault();
				const depth = isShift11 ? 11 : 12;
				let target = focusedSite;
				if (!target && probingSequence.length > 0) {
					target = {
						toothNumber: probingSequence[0]!.toothNumber,
						siteKey: probingSequence[0]!.siteKey,
					};
					setFocusedSite(target);
					setSelectedToothNumber(target.toothNumber);
				}
				if (target) {
					updateToothSite(target.toothNumber, target.siteKey, () => ({
						probingDepthMm: depth,
					}));
					moveToNextSite();
				}
				return;
			}

			const isNumpadOrDigit =
				!e.shiftKey &&
				(/^[0-9]$/.test(e.key) || /^Numpad[0-9]$/.test(e.code));

			if (!focusedSite) {
				if (isNumpadOrDigit) {
					e.preventDefault();
					const rawChar = /^[0-9]$/.test(e.key)
						? e.key
						: e.code.replace("Numpad", "");
					const num = Number.parseInt(rawChar, 10);
					const depth = num === 0 ? 10 : num;
					if (probingSequence.length > 0) {
						const first = probingSequence[0]!;
						updateToothSite(first.toothNumber, first.siteKey, () => ({
							probingDepthMm: depth,
						}));
						if (probingSequence.length > 1) {
							const next = probingSequence[1]!;
							setFocusedSite({
								toothNumber: next.toothNumber,
								siteKey: next.siteKey,
							});
							setSelectedToothNumber(next.toothNumber);
						}
					}
					return;
				}
				if (
					["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Tab", "Enter"].includes(
						e.key,
					)
				) {
					e.preventDefault();
					moveToNextSite();
				}
				return;
			}

			const { toothNumber, siteKey } = focusedSite;

			// Number entry (1..9, 0, NumPad 0..9) for direct probing depth (0 -> 10 mm)
			if (isNumpadOrDigit) {
				e.preventDefault();
				const rawChar = /^[0-9]$/.test(e.key)
					? e.key
					: e.code.replace("Numpad", "");
				const num = Number.parseInt(rawChar, 10);
				const depth = num === 0 ? 10 : num; // '0' maps to 10mm pocket depth
				updateToothSite(toothNumber, siteKey, () => ({
					probingDepthMm: depth,
				}));
				moveToNextSite();
				return;
			}

			// Keypad +/- for Gingival Margin / Depth adjust
			if (e.key === "+" || e.code === "NumpadAdd") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					probingDepthMm: Math.min(15, (prev.probingDepthMm ?? 0) + 1),
				}));
				return;
			}
			if (e.key === "-" || e.code === "NumpadSubtract") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					probingDepthMm: Math.max(0, (prev.probingDepthMm ?? 0) - 1),
				}));
				return;
			}

			// Spacebar or 'b' / 'B' / 'и' / 'И' toggles Bleeding on Probing (Florida Probe style)
			if (
				e.key === " " ||
				e.key === "b" ||
				e.key === "B" ||
				e.key === "и" ||
				e.key === "И"
			) {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					bleedingOnProbing: !prev.bleedingOnProbing,
				}));
				return;
			}

			// Key 'p' / 'P' / 'з' / 'З' toggles Plaque
			if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					plaque: !prev.plaque,
				}));
				return;
			}

			// Key 's' / 'S' / 'ы' / 'Ы' toggles Suppuration
			if (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					suppuration: !prev.suppuration,
				}));
				return;
			}

			// Key 'c' / 'C' / 'с' / 'С' toggles Calculus
			if (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					calculus: !prev.calculus,
				}));
				return;
			}

			// Key 'm' / 'M' / 'ь' / 'Ь' cycles tooth mobility
			if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
				e.preventDefault();
				const currentMobility = toothMap.get(toothNumber)?.mobility ?? 0;
				const nextMobility = ((currentMobility + 1) % 4) as 0 | 1 | 2 | 3;
				updateToothProperties(toothNumber, { mobility: nextMobility });
				return;
			}

			// Key 'f' / 'F' / 'а' / 'А' cycles furcation
			if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
				e.preventDefault();
				if (isFurcationEligibleTooth(toothNumber)) {
					const currentFurcation = toothMap.get(toothNumber)?.furcation ?? 0;
					const nextFurcation = ((currentFurcation + 1) % 5) as
						| 0
						| 1
						| 2
						| 3
						| 4;
					updateToothProperties(toothNumber, { furcation: nextFurcation });
				}
				return;
			}

			// Navigation
			if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
				e.preventDefault();
				moveToNextSite();
			} else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
				e.preventDefault();
				moveToPreviousSite();
			} else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				// Toggle between buccal and lingual aspect
				const isBuccal =
					siteKey === "distoBuccal" ||
					siteKey === "midBuccal" ||
					siteKey === "mesioBuccal";
				const newSiteKey: PerioSiteKey = isBuccal
					? siteKey === "distoBuccal"
						? "distoLingual"
						: siteKey === "midBuccal"
							? "midLingual"
							: "mesioLingual"
					: siteKey === "distoLingual"
						? "distoBuccal"
						: siteKey === "midLingual"
							? "midBuccal"
							: "mesioBuccal";
				setFocusedSite({ toothNumber, siteKey: newSiteKey });
			} else if (e.key === "Escape") {
				setFocusedSite(null);
			}
		},
		[
			readOnly,
			isProbeKeyboardEnabled,
			focusedSite,
			probingSequence,
			toothMap,
			updateToothSite,
			updateToothProperties,
			moveToNextSite,
			moveToPreviousSite,
			setFocusedSite,
			setSelectedToothNumber,
		],
	);
}
