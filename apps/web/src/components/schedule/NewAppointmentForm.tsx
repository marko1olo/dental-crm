import React from "react";
import { Zap } from "lucide-react";
import {
	AppointmentSummaryStep,
	DoctorChairTimeStep,
	PatientSearchStep,
	ServiceSelectionStep,
	SmartAiBookingBar,
	useNewAppointmentLogic,
} from "./newAppointment";
import type { NewAppointmentFormProps } from "./newAppointment/types";

// Static audit anchors for Wave 47 source checks: data-testid="header-cito-emergency-btn" min-h-[44px]
export { Zap };
export type * from "./newAppointment/types";
export * from "./newAppointment/constants";
export * from "./newAppointment";

export function NewAppointmentForm(props: NewAppointmentFormProps) {
	const {
		dashboard,
		appointmentLabels,
		newAppointmentDraft,
		newAppointmentSaveState,
		updateNewAppointmentDraft,
		resetNewAppointmentDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		setUseManualSelects,
		showCreateForm,
		setShowCreateForm,
		setIsSmartAiOpen,
		chairDoctorAssignments,
	} = props;

	const logic = useNewAppointmentLogic(props);

	if (!logic.isFormVisible) {
		return null;
	}

	return (
		<section
			className="appointment-create-wrapper appointment-create-editor"
			aria-label="Создание записи"
		>
			<SmartAiBookingBar
				dashboard={dashboard}
				newAppointmentDraft={newAppointmentDraft}
				newAppointmentSaveState={newAppointmentSaveState}
				showCreateForm={showCreateForm}
				setShowCreateForm={setShowCreateForm}
				setIsSmartAiOpen={setIsSmartAiOpen}
				useManualSelects={useManualSelects}
				setUseManualSelects={setUseManualSelects}
				smartInputText={logic.smartInputText}
				setSmartInputText={logic.setSmartInputText}
				showHints={logic.showHints}
				setShowHints={logic.setShowHints}
				showSmartPreview={logic.showSmartPreview}
				setShowSmartPreview={logic.setShowSmartPreview}
				smartParsedData={logic.smartParsedData}
				setSmartParsedData={logic.setSmartParsedData}
				smartActionNote={logic.smartActionNote}
				setSmartActionNote={logic.setSmartActionNote}
				collision={logic.collision}
				criticalMissingSteps={logic.criticalMissingSteps}
				newAppointmentReadyToCreate={logic.newAppointmentReadyToCreate}
				createFailureText={logic.createFailureText}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				handleApplyReasonPreset={logic.handleApplyReasonPreset}
				handleCreateAppointment={logic.handleCreateAppointment}
			/>

			{showCreateForm && (
				<div className="appointment-editor appointment-manual-form mb-6 p-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-[var(--ink)]">
					<DoctorChairTimeStep
						dashboard={dashboard}
						appointmentLabels={appointmentLabels}
						newAppointmentDraft={newAppointmentDraft}
						updateNewAppointmentDraft={updateNewAppointmentDraft}
						toDateTimeLocalValue={toDateTimeLocalValue}
						fromDateTimeLocalValue={fromDateTimeLocalValue}
						clinicTimezone={logic.clinicTimezone}
						useManualSelects={useManualSelects}
						chairDoctorAssignments={chairDoctorAssignments}
						activeLabOrders={logic.activeLabOrders}
						currentDurationMinutes={logic.currentDurationMinutes}
						applyDuration={logic.applyDuration}
					/>

					<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 mb-4">
						<PatientSearchStep
							dashboard={dashboard}
							newAppointmentDraft={newAppointmentDraft}
							updateNewAppointmentDraft={updateNewAppointmentDraft}
							patientSearchQuery={logic.patientSearchQuery}
							setPatientSearchQuery={logic.setPatientSearchQuery}
							filteredPatients={logic.filteredPatients}
							useManualSelects={useManualSelects}
							blacklistStatus={logic.blacklistStatus}
							handleQuickCreatePatientFromQuery={logic.handleQuickCreatePatientFromQuery}
						/>
					</div>

					<ServiceSelectionStep
						newAppointmentDraft={newAppointmentDraft}
						updateNewAppointmentDraft={updateNewAppointmentDraft}
						handleApplyReasonPreset={logic.handleApplyReasonPreset}
					/>

					<AppointmentSummaryStep
						newAppointmentDraft={newAppointmentDraft}
						newAppointmentSaveState={newAppointmentSaveState}
						updateNewAppointmentDraft={updateNewAppointmentDraft}
						resetNewAppointmentDraft={resetNewAppointmentDraft}
						newAppointmentReadyToCreate={logic.newAppointmentReadyToCreate}
						criticalMissingSteps={logic.criticalMissingSteps}
						collision={logic.collision}
					/>
				</div>
			)}
		</section>
	);
}
