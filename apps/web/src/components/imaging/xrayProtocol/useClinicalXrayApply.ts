/**
 * useClinicalXrayApply.ts — Хук применения находок рентгенодиагностики в карту
 * Mandate 8b: строго <= 120 строк.
 */

import { useState } from "react";
import type { ToothState } from "../../odontogram/ToothChart.js";
import { showToast } from "../../GlobalToast.js";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { logger } from "../../../utils/logger.js";
import type { ToothUpdate } from "./types.js";
import { mapFindingToToothState, parseFdiToothNumber } from "./helpers.js";

interface Options {
	updates: ToothUpdate[];
	summary: string;
	patientId?: string | null | undefined;
	onApplyToChart?: ((appliedCount: number) => Promise<void> | void) | undefined;
	onInsertToDiary?: ((text: string) => void) | undefined;
}

export function useClinicalXrayApply({
	updates,
	summary,
	patientId,
	onApplyToChart,
	onInsertToDiary,
}: Options) {
	const appLogic = useOptionalAppLogicContext();
	const [isApplying, setIsApplying] = useState(false);
	const [isApplied, setIsApplied] = useState(false);

	const handleApplyFindings = async () => {
		if (isApplying || isApplied) return;
		setIsApplying(true);

		try {
			let appliedCount = 0;
			const stateToTeeth = new Map<ToothState, number[]>();
			for (const u of updates) {
				const fdi = parseFdiToothNumber(u.code);
				if (!fdi) continue;
				const state = mapFindingToToothState(u.state);
				const existing = stateToTeeth.get(state) ?? [];
				if (!existing.includes(fdi)) existing.push(fdi);
				stateToTeeth.set(state, existing);
			}

			if (patientId && stateToTeeth.size > 0) {
				const mutationHeaders = appLogic?.denteClinicalMutationHeaders
					? appLogic.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: { "Content-Type": "application/json" };

				for (const [state, toothNumbers] of stateToTeeth.entries()) {
					const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
						method: "POST",
						headers: mutationHeaders,
						body: JSON.stringify({ toothNumbers, state }),
					});
					if (res.ok) {
						appliedCount += toothNumbers.length;
					} else {
						logger.warn(`[ClinicalXray] batch update failed for state ${state}: ${res.status}`);
					}
				}
			} else {
				appliedCount = updates.length;
			}

			const diaryLines = [`[Рентгенодиагностика · Протокол исследования]`, summary];
			if (updates.length > 0) {
				diaryLines.push("Описание состояния зубов:");
				for (const u of updates) diaryLines.push(`• Зуб ${u.code}: ${u.diagnosisOrFinding}`);
			}
			const diaryText = diaryLines.join("\n");

			if (onInsertToDiary) onInsertToDiary(diaryText);
			window.dispatchEvent(
				new CustomEvent("dente-apply-findings-to-diary", {
					detail: { text: diaryText, toothUpdates: updates, summary },
				}),
			);

			if (onApplyToChart) await onApplyToChart(appliedCount);

			setIsApplied(true);
			showToast(
				appliedCount > 0
					? `Данные рентгенодиагностики внесены в карту (${appliedCount} зубов) и дневник приёма`
					: "Протокол рентгенодиагностики внесён в дневник приёма",
				"success",
			);
		} catch (err) {
			logger.error("[ClinicalXray] failed to apply findings", err);
			showToast("Не удалось перенести данные рентгенодиагностики", "error");
		} finally {
			setIsApplying(false);
		}
	};

	return { isApplying, isApplied, handleApplyFindings };
}
