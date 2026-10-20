import React from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { useClinicalStenographer } from "../emk/useClinicalStenographer";

export interface UseVisitDiarySoapStenoParams {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
}

export function useVisitDiarySoapStenographers({
	diary,
	setDiary,
	fieldsDisabled,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
}: UseVisitDiarySoapStenoParams) {
	const handleToothDetected = React.useCallback(
		(tooth: number) => {
			setDiary((p) => (p.diagnosisTooth ? p : { ...p, diagnosisTooth: String(tooth) }));
		},
		[setDiary],
	);

	const anamnesisSteno = useClinicalStenographer({
		value: diary.anamnesis,
		onChange: (next) => {
			ensureRevisingIfLocked();
			setDiary((p) => ({ ...p, anamnesis: next }));
			scheduleDebouncedSave();
		},
		targetField: "anamnesis",
		enableStenographer: !fieldsDisabled,
		onToothDetected: handleToothDetected,
	});

	const treatmentSteno = useClinicalStenographer({
		value: diary.treatmentDescription,
		onChange: (next) => {
			ensureRevisingIfLocked();
			setDiary((p) => ({ ...p, treatmentDescription: next }));
			scheduleDebouncedSave();
		},
		targetField: "treatment",
		enableStenographer: !fieldsDisabled,
		onToothDetected: handleToothDetected,
	});

	const statusLocalisSteno = useClinicalStenographer({
		value: diary.statusLocalis,
		onChange: (next) => {
			ensureRevisingIfLocked();
			setDiary((p) => ({ ...p, statusLocalis: next }));
			scheduleDebouncedSave();
		},
		targetField: "objective",
		enableStenographer: !fieldsDisabled,
		onToothDetected: handleToothDetected,
	});

	return {
		anamnesisSteno,
		treatmentSteno,
		statusLocalisSteno,
	};
}
