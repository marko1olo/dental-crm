import { useCallback } from "react";
import { normalizeWorkingDaysDraft } from "../../AppHelpers";
import { type ClinicProfileDraft } from "../../AppConstants";
import type { StaffScheduleDraft } from "../../utils/clinicProfileUtils";

export interface ScheduleSettingsLogicProps {
	setClinicProfileDraft: React.Dispatch<React.SetStateAction<ClinicProfileDraft>>;
	setClinicProfileDirty: (dirty: boolean) => void;
	setClinicProfileSaveState: (state: "idle" | "saving" | "error" | "saved") => void;
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	updateStaffScheduleDraft: (id: string, patch: Partial<StaffScheduleDraft>) => void;
	chairScheduleDrafts: Record<string, StaffScheduleDraft>;
	updateChairScheduleDraft: (id: string, patch: Partial<StaffScheduleDraft>) => void;
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
		const currentDraft = staffScheduleDrafts[staffId];
		const currentWorkingDays = currentDraft?.workingDays ?? [];
		const workingDays = currentWorkingDays.includes(day)
			? currentWorkingDays.filter((item) => item !== day)
			: [...currentWorkingDays, day];
		updateStaffScheduleDraft(staffId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}, [staffScheduleDrafts, updateStaffScheduleDraft]);

	const toggleChairWorkingDay = useCallback((chairId: string, day: number) => {
		const currentDraft = chairScheduleDrafts[chairId];
		const currentWorkingDays = currentDraft?.workingDays ?? [];
		const workingDays = currentWorkingDays.includes(day)
			? currentWorkingDays.filter((item) => item !== day)
			: [...currentWorkingDays, day];
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
