import React from "react";
import { VisitViewPanel } from "./VisitViewPanel";
import type { ToothState } from "../../odontogram/ToothChart";
import { ToothContextDrawer } from "../../diagnostics/ToothContextDrawer";
import { VisitViewModals } from "./VisitViewModals";
import type { useVisitViewState } from "./useVisitViewState";

export interface VisitViewDesktopLayoutProps {
	readonly s: ReturnType<typeof useVisitViewState>;
}

export function VisitViewDesktopLayout({ s }: VisitViewDesktopLayoutProps) {
	const parsedCode = s.selectedToothForMenu?.code
		? Number.parseInt(s.selectedToothForMenu.code, 10)
		: null;
	const toothNum = Number.isFinite(parsedCode) ? (parsedCode as number) : null;
	const currentCode = s.selectedToothForMenu?.code ?? (toothNum !== null ? String(toothNum) : "");
	const rawState = currentCode
		? s.toothStateByCode[currentCode] || s.selectedToothForMenu?.state || "Healthy"
		: "Healthy";

	return (
		<>
			<VisitViewPanel s={s} />

			{s.selectedToothForMenu && toothNum !== null && (
				<ToothContextDrawer
					isOpen={Boolean(s.selectedToothForMenu)}
					onClose={() => {
						s.setSelectedSurfaces([]);
						s.setSelectedToothForMenu(null);
					}}
					toothNumber={toothNum}
					toothData={{
						toothNumber: toothNum,
						state: (rawState as ToothState) || "Healthy",
					}}
					patient={
						s.activePatient
							? {
									id: s.activePatient.id,
									fullName: s.activePatient.fullName,
									ageYears: typeof s.patientAge === "number" ? s.patientAge : undefined,
							  }
							: undefined
					}
					doctorName={s.activeDoctor?.name || s.activeDoctor?.fullName || "Лечащий врач-стоматолог"}
					onUpdateTooth={(num, updates) => {
						if (updates?.state) {
							s.setToothState(String(num), String(updates.state));
						}
					}}
					onUpdateToothStatus={(num, state) => {
						s.setToothState(String(num), state);
					}}
					onInsertToProtocol={(text) => {
						s.appendToEMKField("objective", text);
					}}
					onOpenFullRadiology={(num) => {
						s.setSelectedSurfaces([]);
						s.setSelectedToothForMenu(null);
						s.setIsVisiographComparisonModalOpen(true);
					}}
				/>
			)}

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
