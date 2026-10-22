import type { EndoStageStamp } from "../endoCanalConstants";
import { useVisitStore } from "../../../store/visitStore";

export function updateVisitStoreWithEndoProtocol(
	activeTooth: number,
	stageStamp: EndoStageStamp,
	protocolTextToInsert: string,
): void {
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existingObj = prev.objectiveStatus?.trim() || "";
			const existingPlan = prev.treatmentPlan?.trim() || "";
			const newObjective = existingObj
				? `${existingObj}\n\n${protocolTextToInsert}`
				: protocolTextToInsert;
			const planSummary = `Эндодонтическое лечение зуба #${activeTooth} (${
				stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2"
					: "Обтурация корневых каналов до апекса"
			})`;
			const newPlan =
				existingPlan && !existingPlan.includes(planSummary)
					? `${existingPlan}\n${planSummary}`
					: existingPlan || planSummary;
			return {
				...prev,
				objectiveStatus: newObjective,
				treatmentPlan: newPlan,
			};
		});
	} catch {
		// safe fallback
	}
}
