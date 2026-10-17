import React from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { PatientAdministrativeForm } from "../PatientAdministrativeForm";

export interface PatientPassportCollapsibleProps {
	readonly patientAdministrativeProfileDraft: any;
	readonly updatePatientAdministrativeProfileDraft: any;
	readonly weekdayOptions: any[];
	readonly normalizeOptionalWorkingDaysDraft: any;
	readonly savePatientAdministrativeProfile: () => void;
	readonly patientAdministrativeProfileSaveState: string;
	readonly patientAdministrativeSaveGuidance: string | null;
	readonly patientAdministrativeSaveGuidanceId: string;
	readonly patientAdministrativeProfileValidationMessage: string | null;
	readonly savePillNode?: React.ReactNode;
}

export function PatientPassportCollapsible({
	patientAdministrativeProfileDraft,
	updatePatientAdministrativeProfileDraft,
	weekdayOptions,
	normalizeOptionalWorkingDaysDraft,
	savePatientAdministrativeProfile,
	patientAdministrativeProfileSaveState,
	patientAdministrativeSaveGuidance,
	patientAdministrativeSaveGuidanceId,
	patientAdministrativeProfileValidationMessage,
	savePillNode,
}: PatientPassportCollapsibleProps) {
	return (
		<details className="settings-advanced-block patient-docs-collapsible mt-4">
			<summary className="settings-advanced-toggle">
				<span className="settings-advanced-label">
					<span className="settings-advanced-icon">
						<FileText size={16} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
					</span>
					Паспортные данные и реквизиты документов
				</span>
				<span className="settings-advanced-hint">Паспорт, ИНН, СНИЛС, представитель, договор</span>
				<span className="settings-advanced-chevron"> </span>
			</summary>
			<div className="settings-advanced-form">
				<div className="panel-heading compact-heading patient-doc-heading flex justify-between items-center mb-2">
					<span className="text-sm font-semibold text-[var(--ink)]">Документы и СНИЛС</span>
					{savePillNode}
				</div>
				{patientAdministrativeProfileValidationMessage && (
					<p className="save-error patient-admin-validation">{patientAdministrativeProfileValidationMessage}</p>
				)}

				<PatientAdministrativeForm
					patientAdministrativeProfileDraft={patientAdministrativeProfileDraft}
					updatePatientAdministrativeProfileDraft={updatePatientAdministrativeProfileDraft}
					weekdayOptions={weekdayOptions}
					normalizeOptionalWorkingDaysDraft={normalizeOptionalWorkingDaysDraft}
				/>

				<div className="patient-admin-actions mt-3 flex justify-start">
					<button
						className="primary-button min-h-[36px] h-9 px-3.5 rounded-xl font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
						type="button"
						onClick={savePatientAdministrativeProfile}
						disabled={patientAdministrativeProfileSaveState === "saving"}
						data-testid="patient-admin-save-btn"
					>
						<ShieldCheck size={16} aria-hidden="true" />
						<span>Сохранить реквизиты</span>
					</button>
				</div>
				{patientAdministrativeSaveGuidance && (
					<p className="patient-save-guidance" id={patientAdministrativeSaveGuidanceId} role="status">
						{patientAdministrativeSaveGuidance}
					</p>
				)}
			</div>
		</details>
	);
}
