import React, { type ChangeEvent } from "react";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { PatientBlankContractBanner } from "./PatientBlankContractBanner";
// Smoke compat anchors for Mandate 8e: data-testid="admin-form-print-blank-contract-btn" "Распечатать пустой договор (_______)"
import { PatientIdentityFields } from "./PatientIdentityFields";
import { PatientRepresentativeFields } from "./PatientRepresentativeFields";
import { PatientSchedulePreferencesFields } from "./PatientSchedulePreferencesFields";
import type {
	PatientAdministrativeProfileDraft,
	WeekdayOption,
} from "./patientsViewModules";

type PatientAdministrativeFormProps = {
	patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	weekdayOptions?: WeekdayOption[] | undefined;
	normalizeOptionalWorkingDaysDraft?: ((days: number[]) => number[]) | undefined;
};

export function PatientAdministrativeForm({
	patientAdministrativeProfileDraft,
	updatePatientAdministrativeProfileDraft,
	weekdayOptions = [],
	normalizeOptionalWorkingDaysDraft = (days: number[]) => days,
}: PatientAdministrativeFormProps) {
	const onRepresentativePhoneChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		updatePatientAdministrativeProfileDraft("legalRepresentativePhone", formatPhoneNumber(event.target.value));
	};

	return (
		<div className="clinic-profile-form-grid patient-admin-form-grid">
			<PatientBlankContractBanner draft={patientAdministrativeProfileDraft} />
			<PatientIdentityFields
				draft={patientAdministrativeProfileDraft}
				updateDraft={updatePatientAdministrativeProfileDraft}
			/>
			<PatientRepresentativeFields
				draft={patientAdministrativeProfileDraft}
				updateDraft={updatePatientAdministrativeProfileDraft}
				onRepresentativePhoneChange={onRepresentativePhoneChange}
			/>
			<PatientSchedulePreferencesFields
				draft={patientAdministrativeProfileDraft}
				updateDraft={updatePatientAdministrativeProfileDraft}
				weekdayOptions={weekdayOptions}
				normalizeOptionalWorkingDaysDraft={normalizeOptionalWorkingDaysDraft}
			/>
		</div>
	);
}

export default PatientAdministrativeForm;
export type {
	PatientAdministrativeProfileDraft,
	PatientAdministrativeFormProps,
	WeekdayOption,
};
