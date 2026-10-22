import React, { Suspense } from "react";
import { showToast } from "../GlobalToast";
import type { CashierInvoiceExportData } from "./types";

const FiscalReceipt54FzModal = React.lazy(() => import("../finance/FiscalReceipt54FzModal").then((m) => ({ default: m.FiscalReceipt54FzModal })));
const LabWorkOrderModal = React.lazy(() => import("../lab/orders/LabWorkOrderModal").then((m) => ({ default: m.LabWorkOrderModal })));
const InvoiceGenerationModal = React.lazy(() => import("../finance/InvoiceGenerationModal").then((m) => ({ default: m.InvoiceGenerationModal })));
const ClinicalServiceBundlesModal = React.lazy(() => import("./ClinicalServiceBundlesModal").then((m) => ({ default: m.ClinicalServiceBundlesModal })));

export interface TreatmentPlanExportModalsProps {
	readonly logic: any;
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
}

export const TreatmentPlanExportModals: React.FC<TreatmentPlanExportModalsProps> = ({ logic, onExportToCashier }) => {
	const handleInvoiceCreated = (inv: any) => {
		const allItems = logic.stages.flatMap((s: any) => s.items);
		const grossTotalRub = allItems.reduce((acc: number, it: any) => acc + it.unitPriceRub * it.quantity, 0);
		const discountRub = allItems.reduce((acc: number, it: any) => acc + it.discountRub, 0);
		const netTotalRub = inv.totalNetRub ?? logic.loyaltyDeduction.netPayableRub;

		const exportData: CashierInvoiceExportData = {
			patientId: logic.patientId, patientName: logic.patientName, invoiceId: inv.invoiceId, invoiceNumber: inv.invoiceNumber, items: allItems, grossTotalRub, discountRub, netTotalRub, netTotalKopecks: Math.round(netTotalRub * 100) as any, notes: `Выписан счет №${inv.invoiceNumber || ""} по плану «${logic.currentTier.title}»`, createdAtIso: new Date().toISOString(),
		};
		if (onExportToCashier) onExportToCashier(exportData);
		showToast(`Документ ${inv.invoiceNumber} успешно сформирован и передан в кассу!`, "success", 4000);
	};

	const initialTeeth = logic.labOrderPrefill?.selectedTeeth?.length ? logic.labOrderPrefill.selectedTeeth : logic.selectedLabTeeth?.length ? logic.selectedLabTeeth : logic.orthopedicTeeth;

	return (
		<>
			{logic.isFiscalModalOpen && (
				<Suspense fallback={null}>
					<FiscalReceipt54FzModal
						isOpen={logic.isFiscalModalOpen}
						items={
							logic.selectedInstallmentStage?.items?.length
								? logic.selectedInstallmentStage.items
								: logic.effectiveSignTier.stages.flatMap((s: any) => s.items)
						}
						patientId={logic.patientId}
						patientName={logic.patientName}
						patientPhone={logic.patientPhone}
						patientDepositRub={Math.round((logic.dashboard?.activePatient?.balanceKopecks || 0) / 100)}
						cashierFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
						clinicName={logic.dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
						onClose={() => {
							logic.setIsFiscalModalOpen(false);
							if (logic.setSelectedInstallmentStage) {
								logic.setSelectedInstallmentStage(null);
							}
						}}
						onReceiptFiscalized={(r) => {
							showToast(`Чек №${r} сохранен в истории оплат`, "success");
							if (logic.setSelectedInstallmentStage) {
								logic.setSelectedInstallmentStage(null);
							}
						}}
					/>
				</Suspense>
			)}

			{logic.isLabOrderModalOpen && (
				<Suspense fallback={null}>
					<LabWorkOrderModal
						isOpen={logic.isLabOrderModalOpen} onClose={() => logic.setIsLabOrderModalOpen(false)} patientId={logic.patientId} patientName={logic.patientName} patientChartNumber={logic.patient?.chartNumber || logic.patient?.cardNumber || `К-${logic.patientId.slice(0, 5)}`} doctorId={logic.labOrderPrefill?.doctorId || logic.auth?.currentUser?.id || "doc-01"} doctorName={logic.labOrderPrefill?.doctorName || logic.auth?.currentUser?.name || "Лечащий врач"} initialTeeth={initialTeeth} treatmentPlanId={logic.currentPlanId || logic.validationPayload?.planId} stageId={logic.labOrderPrefill?.stageId || logic.selectedActStage?.id} stageNumber={logic.labOrderPrefill?.stageNumber ?? logic.selectedActStage?.stageNumber} stageTitle={logic.labOrderPrefill?.stageTitle || logic.selectedActStage?.title} stageTotalRub={logic.labOrderPrefill?.priceRub ?? logic.selectedActStage?.totalRub} onSaveOrder={(order) => showToast(`Наряд-заказ №${order.orderNumber || ""} в ЗТЛ на сумму ${(order.priceRub ?? 0).toLocaleString("ru-RU")} ₽ успешно сохранен!`, "success", 5000)}
					/>
				</Suspense>
			)}

			{logic.isInvoiceModalOpen && (
				<Suspense fallback={null}>
					<InvoiceGenerationModal
						isOpen={logic.isInvoiceModalOpen} onClose={() => logic.setIsInvoiceModalOpen(false)} patientId={logic.patientId} patientName={logic.patientName} patientPhone={logic.patientPhone} patientBalanceRub={logic.patientBalanceRub} planId={`PLAN-${logic.patientId.slice(0, 6).toUpperCase()}`} planNumber={`ПЛАН-№${logic.patientId.slice(0, 4)}`} planTitle={logic.currentTier.title} planCreatedAtIso={new Date().toISOString()} approvedAtIso={logic.signedAgreement ? new Date().toISOString() : undefined} isSignedWithPatient={Boolean(logic.signedAgreement)} doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"} doctorUserId={logic.auth?.currentUser?.id || "doc-01"} planItems={logic.stages.flatMap((s: any) => s.items)} onInvoiceCreated={handleInvoiceCreated}
					/>
				</Suspense>
			)}

			{logic.isChairsideBundlesModalOpen && (
				<Suspense fallback={null}>
					<ClinicalServiceBundlesModal
						isOpen={logic.isChairsideBundlesModalOpen} onClose={() => logic.setIsChairsideBundlesModalOpen(false)} initialToothNumber={logic.orthopedicTeeth[0] || 16} patientId={logic.patientId} patientName={logic.patientName} onApplyToPlan={logic.handleApplyChairsideBundlePlan} onApplyToInvoice={logic.handleApplyChairsideBundleInvoice} targetMode="both"
					/>
				</Suspense>
			)}
		</>
	);
};
