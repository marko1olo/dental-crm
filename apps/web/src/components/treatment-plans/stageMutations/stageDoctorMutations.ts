import type { TreatmentPlanStage } from "../types.js";

export function assignDoctorToStageInStages(
	stages: readonly TreatmentPlanStage[],
	stageNumber: number,
	doctorId: string | null,
	doctorName: string | null,
	doctorSpecialty: string | null,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		if (st.stageNumber === stageNumber) {
			const updatedItems = st.items.map((it) => ({
				...it,
				doctorId,
				doctorName,
				doctorSpecialty,
			}));
			return {
				...st,
				doctorId,
				doctorName,
				doctorSpecialty,
				items: updatedItems,
			};
		}
		return st;
	});
}

export function assignDoctorToItemInStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	doctorId: string | null,
	doctorName: string | null,
	doctorSpecialty: string | null,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === itemId) {
				modified = true;
				return {
					...it,
					doctorId,
					doctorName,
					doctorSpecialty,
				};
			}
			return it;
		});
		if (!modified) return st;
		return {
			...st,
			items: updatedItems,
		};
	});
}
