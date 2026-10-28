/**
 * usePerioPresetActions.ts — Клинические действия экспресс-пресетов и патологий.
 * Архитектурный слой Layer 3: Hook (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, PERIO_SITE_KEYS, type PerioToothRecord } from "@dental/shared";
import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { applyHealthyPeriodontiumPreset, applyPsrSextantCode, type PerioExpressPresetId, type PsrCode } from "../perioMath";
import { applyExpressPerioPreset, applyTherapistPathologyPreset, dispatchPresetSideEffects } from "./perioPresets";

export interface UsePerioPresetActionsOptions {
	readonly readOnly: boolean;
	readonly teeth: readonly PerioToothRecord[];
	readonly selectedToothNumber: number;
	readonly setTeeth: React.Dispatch<React.SetStateAction<PerioToothRecord[]>>;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export function usePerioPresetActions({
	readOnly, teeth, selectedToothNumber, setTeeth, onInsertToProtocol,
}: UsePerioPresetActionsOptions) {
	const handleSetAllIntact = useCallback(() => {
		if (readOnly) return;
		setTeeth((prev) => applyHealthyPeriodontiumPreset(prev));

		const normStatusRu =
			"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда 1–2 мм, кровоточивость отсутствует (BOP 0%), патологических карманов нет, подвижность зубов физиологическая (0 ст.). Скрининг PSR: 0 во всех секстантах (Z01.2).";

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						objectiveStatus: normStatusRu,
						diagnosis: "Z01.2 Стоматологическое обследование (Пародонт интактен / норма)",
						mode: "merge",
					},
				}),
			);
		}

		if (onInsertToProtocol) onInsertToProtocol(normStatusRu);

		showToast("Пародонт интактен (норма): глубина 1–2 мм, BOP 0%, PMA 0%", "success", 4000);
	}, [readOnly, setTeeth, onInsertToProtocol]);

	const handleApplyExpressPreset = useCallback((presetId: PerioExpressPresetId) => {
		if (readOnly) return;
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [readOnly, teeth, onInsertToProtocol, setTeeth]);

	const handleApplySeverePeriodontitisPreset = useCallback(() => {
		handleApplyExpressPreset("periodontitis_severe_express");
	}, [handleApplyExpressPreset]);

	const handleApplySextantCode = useCallback((sextantName: string, code: PsrCode, asterisk = false) => {
		if (readOnly) return;
		setTeeth((prev) => applyPsrSextantCode(prev, sextantName, code, asterisk));
		showToast(`Секстант ${sextantName}: установлен Код ${code}${asterisk ? "*" : ""} (PSR)`, "info", 2500);
	}, [readOnly, setTeeth]);

	const handleMarkSelectedToothPathology = useCallback((depth = 5, hasBop = true) => {
		if (readOnly) return;
		setTeeth((prev) => prev.map((tooth) => {
			if (tooth.toothNumber !== selectedToothNumber || tooth.isMissing) return tooth;
			const updated = { ...tooth };
			for (const key of PERIO_SITE_KEYS) {
				const s = tooth[key] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
				const gm = s.gingivalMarginMm || 0;
				updated[key] = { ...s, probingDepthMm: depth, bleedingOnProbing: hasBop, calMm: calculateClinicalAttachmentLevel(depth, gm) };
			}
			return updated;
		}));
		showToast(`Зуб #${selectedToothNumber}: карман ${depth} мм с BOP зафиксирован`, "info", 3500);
	}, [readOnly, selectedToothNumber, setTeeth]);

	const handleMarkBopOnDeepPockets = useCallback(() => {
		if (readOnly) return;
		let marked = 0;
		setTeeth((prev) => prev.map((tooth) => {
			if (tooth.isMissing) return tooth;
			const updated = { ...tooth };
			for (const key of PERIO_SITE_KEYS) {
				const s = tooth[key];
				if (s && s.probingDepthMm >= 4) { updated[key] = { ...s, bleedingOnProbing: true }; marked++; }
			}
			return updated;
		}));
		showToast(`Кровоточивость (BOP) отмечена на всех карманах ≥ 4 мм (${marked} участков)`, "info", 4000);
	}, [readOnly, setTeeth]);

	const handleClearPlaque = useCallback(() => {
		if (readOnly) return;
		setTeeth((prev) => prev.map((tooth) => {
			const updated = { ...tooth };
			for (const key of PERIO_SITE_KEYS) {
				const s = tooth[key];
				if (s) updated[key] = { ...s, plaque: false };
			}
			return updated;
		}));
		showToast("Зубной налет очищен (индекс гигиены 100%)", "success", 4000);
	}, [readOnly, setTeeth]);

	const handleApplyTherapistPreset = useCallback((presetId: string) => {
		if (readOnly) return;
		const res = applyTherapistPathologyPreset(teeth, presetId);
		if (!res) return;
		setTeeth(res.updatedTeeth);
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [readOnly, teeth, onInsertToProtocol, setTeeth]);

	return {
		handleSetAllIntact, handleApplyExpressPreset, handleApplySeverePeriodontitisPreset,
		handleApplySextantCode, handleMarkSelectedToothPathology, handleMarkBopOnDeepPockets,
		handleClearPlaque, handleApplyTherapistPreset,
	};
}
