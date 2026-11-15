/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Financial & Planning Modals Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Модальные окна поэтапной оплаты плана лечения (эскроу/депозит)
 * и валидатора прейскуранта/наряда-заказа с фиксацией цен.
 */

import React from "react";
import { TreatmentPlanStudioModal } from "../../../treatment-plans/TreatmentPlanStudioModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { showToast } from "../../../GlobalToast";
import type { VisitModalPatientEntity, VisitModalDoctorEntity } from "./visitViewModalsTypes";

export interface FinancialAndPlanningModalsProps {
	effectiveActiveModal: string | null;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	activePatient: VisitModalPatientEntity | null | undefined;
	activeDoctor: VisitModalDoctorEntity | null | undefined;
	priceValidatorPlanPayload?: unknown;
	priceValidatorCatalogList?: unknown;
	appendToEMKField: (field: string, text: string) => void;
}

export const FinancialAndPlanningModals: React.FC<FinancialAndPlanningModalsProps> = ({
	effectiveActiveModal,
	isStagePaymentModalOpen,
	setIsStagePaymentModalOpen,
	isPriceValidatorModalOpen,
	setIsPriceValidatorModalOpen,
	activePatient,
	activeDoctor,
	priceValidatorPlanPayload,
	priceValidatorCatalogList,
	appendToEMKField,
}) => {
	return (
		<>
			{/* Stage Payment & Milestone Escrow via Canonical TreatmentPlanStudioModal */}
			{effectiveActiveModal === "stage_payment" && (
				<TreatmentPlanStudioModal
					isOpen={isStagePaymentModalOpen}
					initialActiveTab="installment"
					onClose={() => {
						setIsStagePaymentModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("stage_payment");
					}}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
					doctorFullName={activeDoctor?.fullName}
				/>
			)}

			{/* Canonical 3-Tier Treatment Plan Presenter & Studio (Mandates 8e, 8n) */}
			{effectiveActiveModal === "price_validator" && isPriceValidatorModalOpen && (
				<TreatmentPlanStudioModal
					isOpen={isPriceValidatorModalOpen}
					onClose={() => {
						setIsPriceValidatorModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("price_validator");
					}}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
					doctorFullName={activeDoctor?.fullName}
					onApprovePlan={(selectedTier) => {
						appendToEMKField(
							"treatmentPlan",
							`Утвержден план лечения «${selectedTier.title}» на сумму ${selectedTier.totalRub.toLocaleString("ru-RU")} ₽.`,
						);
						showToast(
							`План лечения «${selectedTier.title}» (${selectedTier.totalRub.toLocaleString("ru-RU")} ₽) утвержден и добавлен в протокол приема.`,
							"success",
						);
					}}
				/>
			)}
		</>
	);
};
