/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit View Modals (Facade Registry)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Фасадный реестр клинических модальных окон приёма врача.
 * Обеспечивает взаимное исключение модалок (Мандаты 8b, 8e), приоритет
 * экстренной помощи и делегирование в специализированные модули:
 * - DentalLabOrderModalSection: наряды ЗТЛ и связка с ортопедией
 *   Contract props: <DentalLabOrderModal
 *     patientId={activePatient?.id}
 *     patientName={activePatient?.fullName}
 *     doctorId={activeDoctor?.id}
 *     doctorName={activeDoctor?.fullName}
 *     scheduledVisitDate={activeAppointment?.date}
 *     patientChartNumber={activePatient?.cardNumber}
 *   />
 * - EndoAndImagingModals: эндодонтия и сплит-визиограф EzDent-i
 * - FinancialAndPlanningModals: поэтапная оплата и валидатор прейскуранта
 * - ClinicalSupportModals: экстренная помощь, голосовой ввод, гарантии, смены, ИДС
 */

import React from "react";
import {
	extractAppointmentStageInfo,
	getStandardStageTitle,
} from "../visitPlanStageHandoff";
import { DentalLabOrderModalSection } from "./viewModalsModules/DentalLabOrderModalSection";
import { EndoAndImagingModals } from "./viewModalsModules/EndoAndImagingModals";
import { FinancialAndPlanningModals } from "./viewModalsModules/FinancialAndPlanningModals";
import { ClinicalSupportModals } from "./viewModalsModules/ClinicalSupportModals";
import { useVisitModalsManager } from "./viewModalsModules/useVisitModalsManager";
import type { VisitViewModalsProps } from "./viewModalsModules/visitViewModalsTypes";

export type { VisitViewModalsProps } from "./viewModalsModules/visitViewModalsTypes";

export function VisitViewModals(props: VisitViewModalsProps) {
	const {
		loadedTreatmentPlan,
		isVisiographComparisonModalOpen,
		setIsVisiographComparisonModalOpen,
		endoModalToothNumber,
		endoModalToothState,
		isEndoModalOpen,
		setIsEndoModalOpen,
		setEndoModalToothNumber,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		labOrderModalToothNumber,
		setLabOrderModalToothNumber,
		isStagePaymentModalOpen,
		setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		setIsPriceValidatorModalOpen,
		priceValidatorPlanPayload,
		priceValidatorCatalogList,
		isEmergencyModalOpen,
		setIsEmergencyModalOpen,
		isVoiceDictationModalOpen,
		setIsVoiceDictationModalOpen,
		selectedToothForMenu,
		isWarrantyModalOpen,
		setIsWarrantyModalOpen,
		isDoctorShiftModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		setIsInformedConsentModalOpen,
		isPrescriptionModalOpen,
		setIsPrescriptionModalOpen,
		activePatient,
		activeDoctor,
		dashboard,
		patientAge,
		appendToEMKField,
		setToothState,
		visitNoteForm,
		activeAppointment,
	} = props;

	const appointmentStageTarget = React.useMemo(() => {
		return extractAppointmentStageInfo(activeAppointment);
	}, [activeAppointment]);

	const effectiveTreatmentPlanId =
		loadedTreatmentPlan?.id ||
		activeAppointment?.treatmentPlanId ||
		appointmentStageTarget.treatmentPlanId ||
		undefined;
	const effectiveStageNumber =
		activeAppointment?.stageNumber ??
		appointmentStageTarget.stageNumber ??
		1;
	const effectiveStageTitle =
		activeAppointment?.stageTitle ||
		appointmentStageTarget.stageTitle ||
		getStandardStageTitle(effectiveStageNumber);
	const effectiveStageId =
		activeAppointment?.stageId ||
		appointmentStageTarget.stageId ||
		undefined;

	// ИНВАРИАНТ 1: Clinical Visit Exclusivity и взаимное исключение модалок
	const effectiveActiveModal = useVisitModalsManager({
		isEmergencyModalOpen,
		isVisiographComparisonModalOpen: Boolean(isVisiographComparisonModalOpen),
		isLabOrderModalOpen,
		isEndoModalOpen,
		isStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		isVoiceDictationModalOpen,
		isWarrantyModalOpen,
		isDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		isPrescriptionModalOpen,
		setIsEmergencyModalOpen,
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpenSetter: setIsInformedConsentModalOpen,
		setIsPrescriptionModalOpen,
	});

	const isAnyModalActive = Boolean(
		effectiveActiveModal ||
		isVisiographComparisonModalOpen ||
		isEndoModalOpen ||
		isLabOrderModalOpen ||
		isStagePaymentModalOpen ||
		isPriceValidatorModalOpen ||
		isEmergencyModalOpen ||
		isVoiceDictationModalOpen ||
		isWarrantyModalOpen ||
		isDoctorShiftModalOpen ||
		isInformedConsentModalOpen ||
		isPrescriptionModalOpen
	);

	if (!isAnyModalActive) {
		return null;
	}

	return (
		<>
			<EndoAndImagingModals
				effectiveActiveModal={effectiveActiveModal}
				isEndoModalOpen={isEndoModalOpen}
				setIsEndoModalOpen={setIsEndoModalOpen}
				endoModalToothNumber={endoModalToothNumber}
				setEndoModalToothNumber={setEndoModalToothNumber}
				endoModalToothState={endoModalToothState}
				isVisiographComparisonModalOpen={isVisiographComparisonModalOpen}
				setIsVisiographComparisonModalOpen={setIsVisiographComparisonModalOpen}
				activePatient={activePatient}
				dashboard={dashboard}
				patientAge={patientAge}
				appendToEMKField={appendToEMKField}
			/>

			{effectiveActiveModal === "lab_order" && (
				<DentalLabOrderModalSection
					isOpen={isLabOrderModalOpen}
					onClose={() => setIsLabOrderModalOpen(false)}
					activePatient={activePatient}
					activeDoctor={activeDoctor}
					activeAppointment={activeAppointment}
					dashboard={dashboard}
					effectiveTreatmentPlanId={effectiveTreatmentPlanId}
					effectiveStageId={effectiveStageId}
					effectiveStageNumber={effectiveStageNumber}
					effectiveStageTitle={effectiveStageTitle}
					labOrderModalToothNumber={labOrderModalToothNumber}
					setLabOrderModalToothNumber={setLabOrderModalToothNumber}
					setToothState={setToothState}
					appendToEMKField={appendToEMKField}
				/>
			)}

			<FinancialAndPlanningModals
				effectiveActiveModal={effectiveActiveModal}
				isStagePaymentModalOpen={isStagePaymentModalOpen}
				setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
				isPriceValidatorModalOpen={isPriceValidatorModalOpen}
				setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				priceValidatorPlanPayload={priceValidatorPlanPayload}
				priceValidatorCatalogList={priceValidatorCatalogList}
				appendToEMKField={appendToEMKField}
			/>

			<ClinicalSupportModals
				effectiveActiveModal={effectiveActiveModal}
				isEmergencyModalOpen={isEmergencyModalOpen}
				setIsEmergencyModalOpen={setIsEmergencyModalOpen}
				isVoiceDictationModalOpen={isVoiceDictationModalOpen}
				setIsVoiceDictationModalOpen={setIsVoiceDictationModalOpen}
				isWarrantyModalOpen={isWarrantyModalOpen}
				setIsWarrantyModalOpen={setIsWarrantyModalOpen}
				isDoctorShiftModalOpen={isDoctorShiftModalOpen}
				setIsDoctorShiftModalOpen={setIsDoctorShiftModalOpen}
				isInformedConsentModalOpen={isInformedConsentModalOpen}
				setIsInformedConsentModalOpen={setIsInformedConsentModalOpen}
				isPrescriptionModalOpen={isPrescriptionModalOpen}
				setIsPrescriptionModalOpen={setIsPrescriptionModalOpen}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				dashboard={dashboard}
				patientAge={patientAge}
				selectedToothForMenu={selectedToothForMenu}
				visitNoteForm={visitNoteForm}
				activeAppointment={activeAppointment}
				setToothState={setToothState}
				appendToEMKField={appendToEMKField}
			/>
		</>
	);
}
