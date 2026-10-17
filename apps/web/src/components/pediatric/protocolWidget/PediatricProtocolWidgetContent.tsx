import React from "react";
import { showToast } from "../../GlobalToast";
import { PEDIATRIC_TEETH_NAMES } from "./constants";
import { PediatricMobileBottomBar } from "./PediatricMobileBottomBar";
import { PediatricProtocolDetailsAccordion } from "./PediatricProtocolDetailsAccordion";
import { PediatricProtocolDesktopActionBar } from "./PediatricProtocolToolbar";
import { PediatricTreatmentSteps } from "./PediatricTreatmentSteps";
import { PediatricProtocolWidgetModals } from "./PediatricProtocolWidgetModals";
import { PediatricWidgetHeaderSection } from "./PediatricWidgetHeaderSection";
import type { VisitPediatricProtocolWidgetProps } from "./types";
import { usePediatricWidgetState } from "./usePediatricWidgetState";
import { usePediatricWidgetActions } from "./usePediatricWidgetActions";
import { usePediatricClinicalCalculation } from "./usePediatricClinicalCalculation";

export const PediatricProtocolWidgetContent: React.FC<VisitPediatricProtocolWidgetProps> = (props) => {
	const state = usePediatricWidgetState(props);
	const clinicalCalculation = usePediatricClinicalCalculation(state);
	const actions = usePediatricWidgetActions(state, props, clinicalCalculation);

	return (
		<section
			aria-label="Протокол детского стоматологического приёма в медицинской карте"
			className={`pediatric-protocol-widget max-w-full overflow-x-clip rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3.5 sm:p-5 pb-44 md:pb-5 shadow-xs transition ${props.className || ""}`.trim()}
			data-testid="visit-pediatric-protocol-widget"
		>
			<PediatricWidgetHeaderSection state={state} actions={actions} props={props} />

			<PediatricTreatmentSteps
				activePreset={state.activePreset}
				activePresetId={state.activePresetId}
				onSelectPreset={actions.handleSelectPreset}
				isInvasiveProtocol={state.isInvasiveProtocol}
				representative={state.representative}
				onSignConsent323Fz={actions.handleSignConsent323Fz}
				selectedSurfaces={state.selectedSurfaces}
				onToggleSurface={actions.toggleSurface}
				onApplySurfacePreset={actions.handleApplySurfacePreset}
				selectedMaterial={state.selectedMaterial}
				onSelectMaterial={state.setSelectedMaterial}
				representativeFullName={props.representativeFullName}
				representativePhone={props.representativePhone}
				patientPhone={props.patientPhone}
				representativeRole={props.representativeRole}
				patientAgeYears={props.patientAgeYears ?? 6}
				patientWeightKg={state.effectiveWeightKg}
				somaticProfile={props.somaticProfile}
				allergies={props.allergies}
				onSomaticChange={(status, text) => { state.setSomaticStatus(status); state.setSomaticText(text); }}
				onRepresentativeChange={(rep, text) => { state.setRepresentative(rep); state.setRepresentativeText(text); }}
				onAnesthesiaCalculationChange={state.setAnesthesiaCalculation}
				onApplyAnesthesiaText={(text) => { state.setAnesthesiaText(text); showToast("Расчет анестезии применен к протоколу", "success", 2000); }}
			/>

			<PediatricProtocolDetailsAccordion
				show={state.showDetailsAccordion}
				currentTooth={state.currentTooth}
				onSelectTooth={(t) => {
					state.setCurrentTooth(t);
					props.onSelectActiveTooth?.(t);
					showToast(`Выбран зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`, "info", 1500);
				}}
				fullClinicalNoteText={clinicalCalculation.fullClinicalNoteText}
				fullProtocolText043={clinicalCalculation.fullProtocolText043}
			/>

			<PediatricProtocolDesktopActionBar
				onInsertToClinicalNote={actions.handleInsertToClinicalNote}
				onInsertToForm043={actions.handleInsertToClinicalNote}
				onAddServicesToInvoice={actions.handleAddServicesToInvoice}
				onOpenMemoModal={() => state.setIsMemoModalOpen(true)}
				onOpenDiplomaModal={() => state.setIsDiplomaModalOpen(true)}
				servicesCount={clinicalCalculation.services804n.length}
				diagnosisIcd10={clinicalCalculation.diagnosisIcd10}
				primaryService={clinicalCalculation.services804n[0]}
			/>

			<PediatricMobileBottomBar
				currentTooth={state.currentTooth}
				activePreset={state.activePreset}
				diagnosisIcd10={clinicalCalculation.diagnosisIcd10}
				servicesCount={clinicalCalculation.services804n.length}
				onInsertToClinicalNote={actions.handleInsertToClinicalNote}
				onInsertToForm043={actions.handleInsertToClinicalNote}
				onAddServicesToInvoice={actions.handleAddServicesToInvoice}
				onOpenMemoModal={() => state.setIsMemoModalOpen(true)}
				onOpenDiplomaModal={() => state.setIsDiplomaModalOpen(true)}
			/>

			<PediatricProtocolWidgetModals
				isMemoModalOpen={state.isMemoModalOpen}
				setIsMemoModalOpen={state.setIsMemoModalOpen}
				isDiplomaModalOpen={state.isDiplomaModalOpen}
				setIsDiplomaModalOpen={state.setIsDiplomaModalOpen}
				patientName={props.patientName}
				patientPhone={props.patientPhone}
				patientAgeYears={props.patientAgeYears ?? 6}
				doctorName={props.doctorName}
				clinicName={props.clinicName}
				franklRating={state.franklRating}
				setFranklRating={state.setFranklRating}
				activePresetId={state.activePresetId}
				currentTooth={state.currentTooth}
			/>
		</section>
	);
};