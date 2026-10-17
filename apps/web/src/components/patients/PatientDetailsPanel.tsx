import React from "react";
import { PatientTopHeader } from "./header/PatientTopHeader";
import { PatientMobileBackHeader } from "./details/PatientMobileBackHeader";
import { PatientPassportCollapsible } from "./details/PatientPassportCollapsible";
import { PatientOverviewTab } from "./PatientOverviewTab";
import { PatientCardSavePill } from "./patientCardSavePill";
import type { PatientDetailsPanelProps } from "./details/patientDetailsPanelTypes";

export type { PatientDetailsPanelProps };

export function PatientDetailsPanel({
	selectedPatient,
	onBackToList,
	onOpenVisit,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	patientCoreDraft,
	patientCoreSaveState,
	patientCoreDirty,
	savePatientCore,
	patientAdministrativeProfileDraft,
	updatePatientAdministrativeProfileDraft,
	patientAdministrativeProfileSaveState,
	patientAdministrativeProfileDirty,
	patientAdministrativeProfileValidationMessage,
	savePatientAdministrativeProfile,
	patientAdministrativeSaveGuidance,
	patientAdministrativeSaveGuidanceId,
	weekdayOptions,
	normalizeOptionalWorkingDaysDraft,
	executePatientSomaticNorm,
	executeBookAppointment,
}: PatientDetailsPanelProps) {
	const patientBalance = Number((selectedPatient as any)?.balanceRub ?? (selectedPatient as any)?.balance ?? 0);

	return (
		<section className="patient-admin-panel w-full min-w-0 flex flex-col gap-3.5 pb-6" aria-label="Карточка активного пациента">
			<PatientMobileBackHeader selectedPatient={selectedPatient} onBackToList={onBackToList} onOpenVisit={onOpenVisit} />

			{selectedPatient ? (
				<PatientTopHeader
					selectedPatient={selectedPatient}
					patientBalance={patientBalance}
					patientCoreDraft={patientCoreDraft}
					patientCoreSaveState={patientCoreSaveState}
					patientCoreDirty={patientCoreDirty}
					onSavePatientCore={savePatientCore}
					onOpenVisit={onOpenVisit}
					onBookAppointment={executeBookAppointment}
					onOpenPatientCardModal={onOpenPatientCardModal}
					onOpenLoyaltyModal={onOpenLoyaltyModal}
					onExecuteSomaticNorm={executePatientSomaticNorm}
					savePillNode={
						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{ dirty: patientCoreDirty, saveState: patientCoreSaveState },
								{ dirty: patientAdministrativeProfileDirty, saveState: patientAdministrativeProfileSaveState },
							]}
						/>
					}
				/>
			) : (
				<div className="panel-heading p-4 bg-[var(--paper-strong)] rounded-2xl border border-[var(--line)]">
					<h2 className="title text-base font-bold text-[var(--ink)]">Карточка пациента</h2>
				</div>
			)}

			{selectedPatient && <PatientOverviewTab />}

			{selectedPatient && (
				<PatientPassportCollapsible
					patientAdministrativeProfileDraft={patientAdministrativeProfileDraft}
					updatePatientAdministrativeProfileDraft={updatePatientAdministrativeProfileDraft}
					weekdayOptions={weekdayOptions}
					normalizeOptionalWorkingDaysDraft={normalizeOptionalWorkingDaysDraft}
					savePatientAdministrativeProfile={savePatientAdministrativeProfile}
					patientAdministrativeProfileSaveState={patientAdministrativeProfileSaveState}
					patientAdministrativeSaveGuidance={patientAdministrativeSaveGuidance}
					patientAdministrativeSaveGuidanceId={patientAdministrativeSaveGuidanceId}
					patientAdministrativeProfileValidationMessage={patientAdministrativeProfileValidationMessage}
					savePillNode={
						<PatientCardSavePill
							hasSelectedPatient={Boolean(selectedPatient)}
							sections={[
								{
									dirty: patientAdministrativeProfileDirty,
									saveState: patientAdministrativeProfileSaveState,
									validationMessage: patientAdministrativeProfileValidationMessage,
								},
							]}
						/>
					}
				/>
			)}

			<div className="h-16 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}
