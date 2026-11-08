import React from "react";
import { VisitViewPanel } from "./VisitViewPanel";
import { ToothContextDrawer } from "../../diagnostics/ToothContextDrawer";
import { VisitViewModals } from "./VisitViewModals";
import type { useVisitViewState } from "./useVisitViewState";

export interface VisitViewDesktopLayoutProps {
	readonly s: ReturnType<typeof useVisitViewState>;
}

export function VisitViewDesktopLayout({ s }: VisitViewDesktopLayoutProps) {
	const toothNum = s.selectedToothForMenu
		? Number.parseInt(s.selectedToothForMenu.code, 10) || 16
		: 16;
	const currentCode = s.selectedToothForMenu?.code ?? String(toothNum);
	const rawState = s.toothStateByCode[currentCode] || s.selectedToothForMenu?.state || "Healthy";

	return (
		<>
			<VisitViewPanel s={s} />

			<ToothContextDrawer
				isOpen={Boolean(s.selectedToothForMenu)}
				onClose={() => {
					s.setSelectedSurfaces([]);
					s.setSelectedToothForMenu(null);
				}}
				toothNumber={toothNum}
				toothData={{
					toothNumber: toothNum,
					state: rawState as any,
				}}
				patient={s.activePatient}
				doctorName={s.activeDoctor?.name || "Лечащий врач-стоматолог"}
				onUpdateTooth={(num, updatedState) => {
					s.setToothState(String(num), updatedState as any);
				}}
				onInsertToProtocol={(text) => {
					s.appendToEMKField("objective", text);
				}}
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
