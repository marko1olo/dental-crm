/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Financial & Planning Modals Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Модальные окна поэтапной оплаты плана лечения (эскроу/депозит)
 * и валидатора прейскуранта/наряда-заказа с фиксацией цен.
 */

import React from "react";
import { StagePaymentPlanModal } from "../../../treatment-plans/stagePayment/StagePaymentPlanModal";
import { TreatmentPlanPriceValidatorModal } from "../../../treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { showToast } from "../../../GlobalToast";

export interface FinancialAndPlanningModalsProps {
	effectiveActiveModal: string | null;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	activePatient: any;
	activeDoctor: any;
	priceValidatorPlanPayload: any;
	priceValidatorCatalogList: any;
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
			{/* Stage Payment & Milestone Escrow Modal */}
			{effectiveActiveModal === "stage_payment" && (
				<StagePaymentPlanModal
					isOpen={isStagePaymentModalOpen}
					onClose={() => {
						setIsStagePaymentModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("stage_payment");
					}}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
					doctorFullName={activeDoctor?.fullName}
				/>
			)}

			{/* Treatment Plan Price Lock & Pricelist Validator Modal */}
			{effectiveActiveModal === "price_validator" && isPriceValidatorModalOpen && (
				<TreatmentPlanPriceValidatorModal
					isOpen={isPriceValidatorModalOpen}
					onClose={() => {
						setIsPriceValidatorModalOpen(false);
						useUiSurfaceStore.getState().closePrimaryModal("price_validator");
					}}
					planPayload={priceValidatorPlanPayload}
					catalogPricelist={priceValidatorCatalogList}
					onExportWorkOrder={(exportData) => {
						appendToEMKField(
							"treatmentPlan",
							`Сформирован наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽. Фиксация цен: ${exportData.isApprovedByManager ? "Согласовано управляющим" : "По гарантии"}.`,
						);
						showToast(
							`Зуботехнический наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ добавлен в протокол приема.`,
							"success",
						);
					}}
					onExportCompletedAct={(exportData) => {
						appendToEMKField(
							"treatmentPlan",
							`Сформирован счёт и акт услуг ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽.`,
						);
						showToast(
							`Счёт и акт услуг ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ готов к подписанию.`,
							"success",
						);
					}}
				/>
			)}
		</>
	);
};
