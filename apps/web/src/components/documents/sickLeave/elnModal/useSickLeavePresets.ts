import { useState } from "react";
import { DENTAL_CLINICAL_PRESETS } from "../sickLeaveElnPresets";
import { calculateSickLeaveDates, IncapacityPeriod, SickLeaveFormState } from "../sickLeaveElnEngine";
import type { TabType } from "./types";

interface UseSickLeavePresetsParams {
	todayStr: string;
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
	initialDoctorSpecialty: string;
	initialDoctorFio: string;
	initialDoctorSnils: string;
}

export function useSickLeavePresets({
	todayStr,
	formState,
	setFormState,
	initialDoctorSpecialty,
	initialDoctorFio,
	initialDoctorSnils
}: UseSickLeavePresetsParams) {
	const [activeTab, setActiveTab] = useState<TabType>('eln_form');
	const [selectedPresetId, setSelectedPresetId] = useState<string>('acute_purulent_periostitis');

	const handleApplyPreset = (presetKey: string) => {
		const preset = DENTAL_CLINICAL_PRESETS[presetKey];
		if (!preset) return;
		setSelectedPresetId(presetKey);

		const startDate = formState.periods[0]?.dateFrom || formState.issueDate || todayStr;
		const initDates = calculateSickLeaveDates(startDate, preset.defaultDays);

		const p1: IncapacityPeriod = {
			id: 'p-1',
			dateFrom: initDates.dateFrom,
			dateTo: initDates.dateTo,
			doctorSpecialty: initialDoctorSpecialty,
			doctorFio: initialDoctorFio,
			doctorSnils: initialDoctorSnils,
			doctorRole: 'attending'
		};

		setFormState((prev) => ({
			...prev,
			reasonCode: preset.reasonCode,
			icd10Code: preset.icd10Code,
			diagnosisText: preset.clinicalDescriptionRu,
			periods: [p1],
			isVkRequired: preset.isVkMandatory,
			workResumeDate: initDates.workResumeDate
		}));
	};

	const handleToggleVk = (enable: boolean) => {
		setFormState((prev) => ({
			...prev,
			isVkRequired: enable
		}));
	};

	return {
		activeTab,
		setActiveTab,
		selectedPresetId,
		handleApplyPreset,
		handleToggleVk
	};
}
