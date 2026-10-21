import type { TreatmentPlanStage } from "../types.js";

/**
 * Клиническая валидация последовательности этапов плана:
 * - Этап санации/терапии должен предшествовать хирургическому этапу
 * - Этап хирургии должен предшествовать ортопедическому этапу
 * - Проверка на пустые промежуточные этапы
 */
export function validateStageOrderDependencies(
	stages: readonly TreatmentPlanStage[],
): { isValid: boolean; warnings: readonly string[] } {
	const warnings: string[] = [];

	let lastTherapyIdx = -1;
	let firstSurgeryIdx = -1;
	let lastSurgeryIdx = -1;
	let firstOrthoIdx = -1;

	stages.forEach((st, idx) => {
		if (st.stageKind === "stage_1_therapy" || st.stageKind.includes("therapy")) {
			lastTherapyIdx = Math.max(lastTherapyIdx, idx);
		}
		if (st.stageKind === "stage_2_surgery" || st.stageKind.includes("surgery")) {
			if (firstSurgeryIdx === -1) firstSurgeryIdx = idx;
			lastSurgeryIdx = Math.max(lastSurgeryIdx, idx);
		}
		if (st.stageKind === "stage_3_orthopedics" || st.stageKind.includes("orthopedics")) {
			if (firstOrthoIdx === -1) firstOrthoIdx = idx;
		}

		if (st.items.length === 0 && idx < stages.length - 1) {
			warnings.push(`Этап ${st.stageNumber} («${st.title}») не содержит процедур.`);
		}
	});

	if (firstSurgeryIdx !== -1 && lastTherapyIdx > firstSurgeryIdx) {
		warnings.push(
			"Терапевтическая санация расположена после хирургического этапа. Рекомендуется сначала устранить инфекционные очаги.",
		);
	}

	if (firstOrthoIdx !== -1 && lastSurgeryIdx > firstOrthoIdx) {
		warnings.push(
			"Хирургический этап расположен после ортопедической реабилитации. Ортопедическое протезирование должно завершать план.",
		);
	}

	return {
		isValid: warnings.length === 0,
		warnings,
	};
}
