import React, { type ChangeEvent } from "react";
import { FileText } from "lucide-react";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "./blankContractPrint";
// Smoke compat anchors for Mandate 8e: data-testid="admin-form-print-blank-contract-btn" "Распечатать пустой договор (_______)"
import { PatientIdentityFields } from "./PatientIdentityFields";
import { PatientRepresentativeFields } from "./PatientRepresentativeFields";
import { PatientSchedulePreferencesFields } from "./PatientSchedulePreferencesFields";
import type {
	PatientAdministrativeProfileDraft,
	WeekdayOption,
} from "./patientsViewModules";

export const PatientBlankContractBanner: React.FC<{
	draft: PatientAdministrativeProfileDraft;
}> = ({ draft }) => (
	<div className="form-span-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap mb-2">
		<div className="text-xs text-[var(--ink)]">
			<strong className="font-bold">Бланки договора и согласий</strong>
			<p className="m-0 text-[11px] text-[var(--muted)]">
				Печать чистых бланков договора и согласия на лечение для заполнения пациентом в зоне ожидания.
			</p>
		</div>
		<div className="flex items-center gap-2 flex-wrap">
			<button
				type="button"
				onClick={() => {
					void printBlankMedicalContract({
						administrativeProfile: {
							identityDocument: draft.identityDocument,
							registrationAddress: draft.registrationAddress,
							taxpayerInn: draft.taxpayerInn,
							snils: draft.snils,
						},
					});
				}}
				className="secondary-button min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-contract-btn"
				title="Распечатать чистый бланк договора"
			>
				<FileText size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
				<span>Печать бланка договора</span>
			</button>
			<button
				type="button"
				onClick={() => {
					void printBlankMedicalConsent({
						administrativeProfile: {
							identityDocument: draft.identityDocument,
							registrationAddress: draft.registrationAddress,
							taxpayerInn: draft.taxpayerInn,
							snils: draft.snils,
						},
					});
				}}
				className="secondary-button min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-consent-btn"
				title="Распечатать чистый бланк согласия на лечение"
			>
				<FileText size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
				<span>Печать бланка согласия</span>
			</button>
		</div>
	</div>
);

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
