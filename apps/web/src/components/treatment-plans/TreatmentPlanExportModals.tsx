import React, { Suspense } from "react";
import { showToast } from "../GlobalToast";
import type { CashierInvoiceExportData } from "./types";
import { CashRegisterCheckoutModal } from "../billing/CashRegisterCheckoutModal";

const LabWorkOrderModal = React.lazy(() =>
	import("../lab/orders/LabWorkOrderModal").then((m) => ({ default: m.LabWorkOrderModal })),
);
const InvoiceGenerationModal = React.lazy(() =>
	import("../finance/InvoiceGenerationModal").then((m) => ({ default: m.InvoiceGenerationModal })),
);
const ClinicalServiceBundlesModal = React.lazy(() =>
	import("./ClinicalServiceBundlesModal").then((m) => ({ default: m.ClinicalServiceBundlesModal })),
);

export interface TreatmentPlanExportModalsProps {
	readonly logic: any;
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
}

export const TreatmentPlanExportModals: React.FC<TreatmentPlanExportModalsProps> = ({
	logic,
	onExportToCashier,
}) => {
	const handleInvoiceCreated = (inv: any) => {
		const allItems = logic.stages.flatMap((s: any) => s.items);
		const grossTotalRub = allItems.reduce(
			(acc: number, it: any) => acc + (it.unitPriceRub || it.priceRub || 0) * (it.quantity || 1),
			0,
		);
		const discountRub = allItems.reduce(
			(acc: number, it: any) => acc + (it.discountRub || 0),
			0,
		);
		const netTotalRub = inv.totalNetRub ?? logic.loyaltyDeduction?.netPayableRub ?? grossTotalRub;

		const exportData: CashierInvoiceExportData = {
			patientId: logic.patientId,
			patientName: logic.patientName,
			invoiceId: inv.invoiceId,
			invoiceNumber: inv.invoiceNumber,
			items: allItems,
			grossTotalRub,
			discountRub,
			netTotalRub,
			netTotalKopecks: Math.round(netTotalRub * 100) as any,
			notes: `Сформирован счет №${inv.invoiceNumber || ""} по плану «${logic.currentTier?.title || "План"}»`,
			createdAtIso: new Date().toISOString(),
		};
		if (onExportToCashier) onExportToCashier(exportData);
		showToast(`Документ ${inv.invoiceNumber} успешно сформирован и передан в кассу!`, "success", 4000);
	};

	const initialTeeth =
		logic.labOrderPrefill?.selectedTeeth?.length
			? logic.labOrderPrefill.selectedTeeth
			: logic.selectedLabTeeth?.length
				? logic.selectedLabTeeth
				: logic.orthopedicTeeth;

	const targetDueRub =
		logic.selectedInstallmentStage?.totalRub ??
		logic.effectiveSignTier?.totalRub ??
		0;

	return (
		<>
			{/* Прямой финансовый мост в Кассу: чекаут этапа плана без ручного перенабора */}
			{logic.isFiscalModalOpen && (
				<CashRegisterCheckoutModal
					isOpen={logic.isFiscalModalOpen}
					onClose={() => {
						logic.setIsFiscalModalOpen(false);
						if (logic.setSelectedInstallmentStage) {
							logic.setSelectedInstallmentStage(null);
						}
					}}
					patientId={logic.patientId}
					patientName={logic.patientName}
					patientPhone={logic.patientPhone}
					amountRub={targetDueRub}
					amountKopecks={Math.round(targetDueRub * 100)}
					doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
					title={
						logic.selectedInstallmentStage
							? `Оплата этапа ${logic.selectedInstallmentStage.stageNumber || 1}: ${logic.selectedInstallmentStage.title || ""}`
							: `Оплата плана лечения «${logic.currentTier?.title || "План"}»`
					}
					onPaymentComplete={() => {
						showToast("Оплата успешно принята в кассе клиники!", "success");
						if (logic.setSelectedInstallmentStage) {
							logic.setSelectedInstallmentStage(null);
						}
						logic.setIsFiscalModalOpen(false);
					}}
				/>
			)}

			{logic.isLabOrderModalOpen && (
				<Suspense fallback={null}>
					<LabWorkOrderModal
						isOpen={logic.isLabOrderModalOpen}
						onClose={() => logic.setIsLabOrderModalOpen(false)}
						patientId={logic.patientId}
						patientName={logic.patientName}
						patientChartNumber={
							logic.patient?.chartNumber ||
							logic.patient?.cardNumber ||
							`К-${logic.patientId.slice(0, 5)}`
						}
						doctorId={logic.labOrderPrefill?.doctorId || logic.auth?.currentUser?.id || "doc-01"}
						doctorName={
							logic.labOrderPrefill?.doctorName ||
							logic.auth?.currentUser?.name ||
							"Лечащий врач"
						}
						initialTeeth={initialTeeth}
						treatmentPlanId={logic.currentPlanId || logic.validationPayload?.planId}
						stageId={logic.labOrderPrefill?.stageId || logic.selectedActStage?.id}
						stageNumber={logic.labOrderPrefill?.stageNumber ?? logic.selectedActStage?.stageNumber}
						stageTitle={logic.labOrderPrefill?.stageTitle || logic.selectedActStage?.title}
						stageTotalRub={logic.labOrderPrefill?.priceRub ?? logic.selectedActStage?.totalRub}
						onSaveOrder={(order) =>
							showToast(
								`Наряд-заказ №${order.orderNumber || ""} в лабораторию на сумму ${(order.priceRub ?? 0).toLocaleString("ru-RU")} ₽ успешно сохранен!`,
								"success",
								5000,
							)
						}
					/>
				</Suspense>
			)}

			{logic.isInvoiceModalOpen && (
				<Suspense fallback={null}>
					<InvoiceGenerationModal
						isOpen={logic.isInvoiceModalOpen}
						onClose={() => logic.setIsInvoiceModalOpen(false)}
						patientId={logic.patientId}
						patientName={logic.patientName}
						patientPhone={logic.patientPhone}
						patientBalanceRub={logic.patientBalanceRub}
						planId={`PLAN-${logic.patientId.slice(0, 6).toUpperCase()}`}
						planNumber={`ПЛАН-№${logic.patientId.slice(0, 4)}`}
						planTitle={logic.currentTier?.title || "План"}
						planCreatedAtIso={new Date().toISOString()}
						approvedAtIso={logic.signedAgreement ? new Date().toISOString() : undefined}
						isSignedWithPatient={Boolean(logic.signedAgreement)}
						doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
						doctorUserId={logic.auth?.currentUser?.id || "doc-01"}
						planItems={logic.stages.flatMap((s: any) => s.items)}
						onInvoiceCreated={handleInvoiceCreated}
					/>
				</Suspense>
			)}

			{logic.isChairsideBundlesModalOpen && (
				<Suspense fallback={null}>
					<ClinicalServiceBundlesModal
						isOpen={logic.isChairsideBundlesModalOpen}
						onClose={() => logic.setIsChairsideBundlesModalOpen(false)}
						initialToothNumber={logic.orthopedicTeeth?.[0] || 16}
						patientId={logic.patientId}
						patientName={logic.patientName}
						onApplyToPlan={logic.handleApplyChairsideBundlePlan}
						onApplyToInvoice={logic.handleApplyChairsideBundleInvoice}
						targetMode="both"
					/>
				</Suspense>
			)}
		</>
	);
};

export default TreatmentPlanExportModals;
