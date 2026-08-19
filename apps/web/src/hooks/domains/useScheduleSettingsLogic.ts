import { useCallback } from "react";
import { normalizeWorkingDaysDraft } from "../../AppHelpers";
import { type ClinicProfileDraft } from "../../AppConstants";

export interface ScheduleSettingsLogicProps {
	setClinicProfileDraft: React.Dispatch<React.SetStateAction<ClinicProfileDraft>>;
	setClinicProfileDirty: (dirty: boolean) => void;
	setClinicProfileSaveState: (state: "idle" | "saving" | "error" | "saved") => void;
	staffScheduleDrafts: Record<string, any>;
	updateStaffScheduleDraft: (id: string, patch: any) => void;
	chairScheduleDrafts: Record<string, any>;
	updateChairScheduleDraft: (id: string, patch: any) => void;
}

export function useScheduleSettingsLogic({
	setClinicProfileDraft,
	setClinicProfileDirty,
	setClinicProfileSaveState,
	staffScheduleDrafts,
	updateStaffScheduleDraft,
	chairScheduleDrafts,
	updateChairScheduleDraft,
}: ScheduleSettingsLogicProps) {
	const toggleClinicWorkingDay = useCallback((day: number) => {
		setClinicProfileDraft((current) => {
			const nextDays = current.workingDays.includes(day)
				? current.workingDays.filter((item) => item !== day)
				: [...current.workingDays, day];
			return { ...current, workingDays: normalizeWorkingDaysDraft(nextDays) };
		});
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}, [setClinicProfileDraft, setClinicProfileDirty, setClinicProfileSaveState]);

	const toggleStaffWorkingDay = useCallback((staffId: string, day: number) => {
		const currentDraft = staffScheduleDrafts[staffId] ?? { workingDays: [] };
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateStaffScheduleDraft(staffId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}, [staffScheduleDrafts, updateStaffScheduleDraft]);

	const toggleChairWorkingDay = useCallback((chairId: string, day: number) => {
		const currentDraft = chairScheduleDrafts[chairId] ?? { workingDays: [] };
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item) => item !== day)
			: [...currentDraft.workingDays, day];
		updateChairScheduleDraft(chairId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}, [chairScheduleDrafts, updateChairScheduleDraft]);

	return {
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		toggleChairWorkingDay,
	};
}
