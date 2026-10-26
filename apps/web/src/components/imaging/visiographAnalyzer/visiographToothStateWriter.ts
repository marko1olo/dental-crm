/**
 * visiographToothStateWriter.ts — Запись состояний зубов из визиографа в зубную формулу
 * Mandate 8b: строго <= 120 строк.
 */

import { countLabel } from "../../../AppHelpers.js";
import { actionFailureToast } from "../../../lib/panelStateText.js";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import { TOOTH_STATE_LABELS, type ToothState } from "../../odontogram/ToothChart.js";

export async function writeToothStatesToChart(
	targetPatientId: string,
	toothNumbers: number[],
	state: ToothState,
	mutationHeaders: (extra?: Record<string, string>) => Record<string, string>,
): Promise<string | null> {
	const action = `Отметка «${TOOTH_STATE_LABELS[state]}» по снимку на ${countLabel(toothNumbers.length, "зубе", "зубах", "зубах")} ${toothNumbers.join(", ")} не внесена в зубную формулу`;
	try {
		const res = await fetch(
			`/api/patients/${targetPatientId}/tooth-states/batch`,
			{
				method: "POST",
				headers: mutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ toothNumbers, state }),
			},
		);
		if (!res.ok) {
			const rawBody = await res.text();
			logger.error(
				`[VisiographAnalyzer] формула не обновлена, ${res.status} ${rawBody.slice(0, 300)}`,
			);
			return `${actionFailureToast(action, res.status)} Поставьте отметку на схеме зубов руками.`;
		}
		return null;
	} catch (err) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("[VisiographAnalyzer] запрос обновления формулы не выполнен", err);
		return `${actionFailureToast(action, null)} Поставьте отметку на схеме зубов руками.`;
	}
}
