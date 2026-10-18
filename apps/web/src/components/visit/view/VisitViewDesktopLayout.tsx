import React from "react";
import { VisitViewPanel } from "./VisitViewPanel";
import { VisitClinicalToothModal } from "./VisitClinicalToothModal";
import { VisitViewModals } from "./VisitViewModals";
import type { useVisitViewState } from "./useVisitViewState";

export interface VisitViewDesktopLayoutProps {
	readonly s: ReturnType<typeof useVisitViewState>;
}

export function VisitViewDesktopLayout({ s }: VisitViewDesktopLayoutProps) {
	return (
		<>
			<VisitViewPanel s={s} />

			<VisitClinicalToothModal
				selectedToothForMenu={s.selectedToothForMenu}
				closeClinicalModal={() => {
					s.setSelectedSurfaces([]);
					s.setSelectedToothForMenu(null);
				}}
				toothStateByCode={s.toothStateByCode}
				materialCategory={s.materialCategory}
				setMaterialCategory={s.setMaterialCategory}
				handleSelectDiagnosis={s.handleToothDiagnosisSelect}
				handleSelectSurface={s.handleSelectSurface}
				selectedSurfaces={s.selectedSurfaces}
				isSurfaceMode={s.isSurfaceMode}
				setIsSurfaceMode={s.setIsSurfaceMode}
				setEndoModalToothNumber={s.setEndoModalToothNumber}
				setEndoModalToothState={s.setEndoModalToothState}
				setIsEndoModalOpen={s.setIsEndoModalOpen}
				appendToEMKField={s.appendToEMKField}
				setLabOrderModalToothNumber={s.setLabOrderModalToothNumber}
				setIsLabOrderModalOpen={s.setIsLabOrderModalOpen}
				visitWarnings={s.visitWarnings}
				onAddServiceToTooth={s.onAddServiceToTooth}
			/>

			<VisitViewModals
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				isVisiographComparisonModalOpen={s.isVisiographComparisonModalOpen}
				setIsVisiographComparisonModalOpen={s.setIsVisiographComparisonModalOpen}
				endoModalToothNumber={s.endoModalToothNumber}
				endoModalToothState={s.endoModalToothState}
				isEndoModalOpen={s.isEndoModalOpen}
				setIsEndoModalOpen={s.setIsEndoModalOpen}
				setEndoModalToothNumber={s.setEndoModalToothNumber}
				isLabOrderModalOpen={s.isLabOrderModalOpen}
				setIsLabOrderModalOpen={s.setIsLabOrderModalOpen}
				labOrderModalToothNumber={s.labOrderModalToothNumber}
				setLabOrderModalToothNumber={s.setLabOrderModalToothNumber}
				isStagePaymentModalOpen={s.isStagePaymentModalOpen}
				setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen}
				isPriceValidatorModalOpen={s.isPriceValidatorModalOpen}
				setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen}
				priceValidatorPlanPayload={s.activePlan || undefined}
				priceValidatorCatalogList={s.dashboard?.serviceCatalog}
				isEmergencyModalOpen={s.isEmergencyModalOpen}
				setIsEmergencyModalOpen={s.setIsEmergencyModalOpen}
				isVoiceDictationModalOpen={s.isVoiceDictationModalOpen}
				setIsVoiceDictationModalOpen={s.setIsVoiceDictationModalOpen}
				selectedToothForMenu={s.selectedToothForMenu}
				isWarrantyModalOpen={s.isWarrantyModalOpen}
				setIsWarrantyModalOpen={s.setIsWarrantyModalOpen}
				isDoctorShiftModalOpen={s.isDoctorShiftModalOpen}
				setIsDoctorShiftModalOpen={s.setIsDoctorShiftModalOpen}
				isInformedConsentModalOpen={s.isInformedConsentModalOpen}
				setIsInformedConsentModalOpen={s.setIsInformedConsentModalOpen}
				activePatient={s.activePatient}
				activeDoctor={s.activeDoctor}
				dashboard={s.dashboard}
				patientAge={s.patientAge}
				activeAppointment={s.activeAppointment}
				appendToEMKField={s.appendToEMKField}
				setToothState={s.setToothState}
				visitNoteForm={s.visitNoteForm}
			/>
		</>
	);
}
