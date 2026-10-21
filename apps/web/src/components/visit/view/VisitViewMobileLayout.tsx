import React from "react";
import { MobileChairsideVisitWorkspace } from "../MobileChairsideVisitWorkspace";
import { VisitViewModals } from "./VisitViewModals";
import type { useVisitViewState } from "./useVisitViewState";

export interface VisitViewMobileLayoutProps {
	readonly s: ReturnType<typeof useVisitViewState>;
}

export function VisitViewMobileLayout({ s }: VisitViewMobileLayoutProps) {
	return (
		<>
			<MobileChairsideVisitWorkspace
				activePatient={s.activePatient}
				activeAppointment={s.activeAppointment}
				activeDoctor={s.activeDoctor}
				visitNoteForm={s.visitNoteForm}
				updateVisitNoteField={s.updateVisitNoteField}
				flushPendingVisitSaves={s.flushPendingVisitSaves}
				handleApplySomaticNormQuick={s.handleApplySomaticNormQuick}
				handleFinishVisitAction={s.handleFinishVisitAction}
				handlePrintForm043uFast={s.handlePrintForm043uFast}
				handleOpenPrescription={() => s.setIsPrescriptionModalOpen(true)}
				handleOpenLabOrder={s.handleOpenLabOrder}
				onOpenWarrantyModal={() => s.setIsWarrantyModalOpen(true)}
				consolidatedAllergyChip={s.consolidatedAllergyChip}
				patientAge={s.patientAge}
				toothStateByCode={s.toothStateByCode as Record<string, string>}
				setToothState={s.setToothState}
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				onClose={() => {
					if (typeof (s.props as any).onCloseVisit === "function") {
						(s.props as any).onCloseVisit();
					} else {
						window.dispatchEvent(new CustomEvent("dente:navigate-to-schedule"));
					}
				}}
				testId="mobile-chairside-visit-workspace"
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
				isPrescriptionModalOpen={s.isPrescriptionModalOpen}
				setIsPrescriptionModalOpen={s.setIsPrescriptionModalOpen}
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
