/**
 * apps/web/src/components/visit/VisitServiceBillingWidget.tsx
 * DENTE Dental CRM — Chairside Visit Service Billing & 54-FZ Cash Register Widget (Mandates 8b, 8d, 8e, 8n).
 * Decomposed into modular subcomponents; compliant with Mandate 8b (<= 120 lines).
 */

import React, { useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { VisitBillingModals } from "./VisitBillingModals.js";
import { isDemoShowcaseMode, isDemoPatientId } from "../../lib/demoMode.js";
import { printVisitBillingEstimate } from "./visitBillingPrint.js";
import { staffTelemetryService } from "../../services/logging/staffTelemetryService.js";
import { ChairsideBillingItemRow } from "./ChairsideBillingItemRow.js";
import { useVisitStore } from "../../store/visitStore.js";
import {
	type VisitBillingServiceItem, type VisitBillingTotals, type VisitServiceBillingWidgetProps,
	DEFAULT_CHAIRSIDE_SERVICES, DOCTOR_DISCOUNT_PRESETS, syncBillingItemsToVisitStore,
} from "./visitBillingTypes.js";
export {
	type VisitBillingServiceItem, type VisitBillingTotals, type VisitServiceBillingWidgetProps,
	DEFAULT_CHAIRSIDE_SERVICES, DOCTOR_DISCOUNT_PRESETS, syncBillingItemsToVisitStore,
};
import { useVisitBillingTotals } from "./billing/useVisitBillingTotals.js";
import { useVisitBillingDms } from "./billing/useVisitBillingDms.js";
import { useVisitBillingExternalEvents } from "./billing/useVisitBillingExternalEvents.js";
import { useVisitServiceItemActions } from "./billing/useVisitServiceItemActions.js";
import { VisitBillingHeader } from "./billing/VisitBillingHeader.js";
import { VisitBillingEmptyState } from "./billing/VisitBillingEmptyState.js";
import { VisitBillingTotalsSummary } from "./billing/VisitBillingTotalsSummary.js";
import { VisitBillingActionsFooter } from "./billing/VisitBillingActionsFooter.js";

export const VisitServiceBillingWidget: React.FC<VisitServiceBillingWidgetProps> = ({
	visitId, patientId = "pat-walkin", patientName = "Пациент", patientPhone = "",
	patientDepositRub = 0, patientFamilyBalanceRub = 0, doctorName = "Врач-стоматолог",
	cashierName, clinicLegalName = "ООО «ДЕНТЕ»", initialServices, onServicesChange,
	onSave, onOpenPayment, onPaymentSuccess, onAddBillingItem,
	dmsGuaranteeLetterId, dmsGuaranteeLetterNumber, dmsInsurerName,
	availableDmsCoverageRub, initialSplitDmsRub, readOnly = false, className = "",
}) => {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	const [services, setServices] = useState<VisitBillingServiceItem[]>(() => {
		if (initialServices && initialServices.length > 0) return [...initialServices];
		const storeItems = useVisitStore.getState().completedServices || [];
		if (storeItems.length > 0) {
			return storeItems.map((s, idx) => ({
				id: s.serviceId || `store-svc-${idx}`, code804n: s.code804n || "A16.07.002",
				title: s.name || "Стоматологическая услуга",
				toothCode: s.toothCode ?? (s.toothNumber ? String(s.toothNumber) : undefined),
				quantity: s.quantity || 1, unitPriceRub: s.priceRub || 0, discountPercent: 0, discountRub: 0, isWarranty: false,
			}));
		}
		if (isDemoShowcaseMode() || isDemoPatientId(patientId)) return [...DEFAULT_CHAIRSIDE_SERVICES];
		return [];
	});

	const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
	const [isGlobalWarranty100, setIsGlobalWarranty100] = useState<boolean>(false);
	const [globalDiscountReason, setGlobalDiscountReason] = useState<string>("");
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [selectedBomService, setSelectedBomService] = useState<VisitBillingServiceItem | null>(null);
	const [isDmsModalOpen, setIsDmsModalOpen] = useState<boolean>(false);

	const updateServices = useCallback((next: VisitBillingServiceItem[]) => {
		setServices(next); syncBillingItemsToVisitStore(next); onServicesChange?.(next);
	}, [onServicesChange]);

	// Event listener for invoice services: window.addEventListener("dente-add-services-to-invoice", handleAddServicesToInvoice)
	useVisitBillingExternalEvents({ setServices, onServicesChange, onAddBillingItem });
	const itemActions = useVisitServiceItemActions({ services, updateServices, setServices, onServicesChange, readOnly, visitId, patientId });
	const dms = useVisitBillingDms({ patientId, dmsGuaranteeLetterId, dmsGuaranteeLetterNumber, dmsInsurerName, availableDmsCoverageRub, isDemo });
	const totals = useVisitBillingTotals(services, globalDiscountPercent, isGlobalWarranty100);

	const applyGlobalDiscount = useCallback((percent: number, reason: string) => {
		if (readOnly) return;
		const clamped = Math.max(0, Math.min(100, percent));
		const isWarranty = clamped === 100;
		setGlobalDiscountPercent(clamped); setIsGlobalWarranty100(isWarranty); setGlobalDiscountReason(reason);
		staffTelemetryService.logDiscountApply(patientId, clamped, reason);
		if (isWarranty) showToast("Применена 100% скидка врача: Гарантийная переделка (0 ₽)", "info", 2500);
		else if (clamped > 0) showToast(`Применена скидка врача ${clamped}% (${reason})`, "info", 2000);
		else showToast("Скидка врача сброшена (0%)", "info", 1500);
	}, [readOnly, patientId]);

	return (
		<div className={`p-4 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] space-y-4 shadow-sm ${className}`} data-testid="visit-service-billing-widget">
			<VisitBillingHeader servicesCount={services.length} doctorName={doctorName} readOnly={readOnly} onAddService={itemActions.handleAddService} onOpenBom={() => setSelectedBomService(services[0] || null)} onPrintEstimate={() => printVisitBillingEstimate({ services, totals, clinicLegalName, patientName, doctorName })} />
			{totals.isWarranty100 && (
				<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 font-bold" data-testid="warranty-100-active-banner">
					<div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600 shrink-0" /><span>Гарантийный приём / 100% скидка врача • К оплате в кассу: 0 ₽</span></div>
					<span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Без фискального трения</span>
				</div>
			)}
			<div className="space-y-2" data-testid="chairside-services-list">
				{services.length === 0 ? <VisitBillingEmptyState readOnly={readOnly} onAddService={itemActions.handleAddService} /> : services.map((item, index) => (
					<ChairsideBillingItemRow key={item.id} item={item} index={index} isWarranty100={totals.isWarranty100} readOnly={readOnly} onToggleWarranty={itemActions.handleToggleWarranty} onQuantityChange={itemActions.handleQuantityChange} onStepPrice={itemActions.handleStepPrice} onPriceChange={itemActions.handlePriceChange} onRemoveService={itemActions.handleRemoveService} onOpenMaterialDeduction={(it) => setSelectedBomService(it)} />
				))}
			</div>
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
				{Boolean(totals.totalLabCostRub && totals.totalLabCostRub > 0) && (
					<span className="sr-only" data-testid="badge-total-lab-cost">Себестоимость ЗТЛ: {totals.totalLabCostRub} ₽</span>
				)}
				<VisitBillingTotalsSummary totals={totals} isGlobalWarranty100={isGlobalWarranty100} globalDiscountPercent={globalDiscountPercent} globalDiscountReason={globalDiscountReason} onApplyGlobalDiscount={applyGlobalDiscount} />
				<VisitBillingActionsFooter isSaving={isSaving} totals={totals} readOnly={readOnly} effectiveDmsCoverage={dms.effectiveDmsCoverage} effectiveDmsNumber={dms.effectiveDmsNumber} effectiveDmsInsurer={dms.effectiveDmsInsurer} onSave={async () => { setIsSaving(true); try { onSave?.(services, totals); showToast("Расчёт услуг визита сохранён", "success", 2000); } finally { setIsSaving(false); } }} onPrintEstimate={() => printVisitBillingEstimate({ services, totals, clinicLegalName, patientName, doctorName })} onOpenDmsModal={() => setIsDmsModalOpen(true)} onOpenPaymentModal={() => onOpenPayment ? onOpenPayment(totals) : setIsPaymentModalOpen(true)} />
			</div>
			<VisitBillingModals isPaymentModalOpen={isPaymentModalOpen} onClosePaymentModal={() => setIsPaymentModalOpen(false)} patientId={patientId} patientName={patientName} patientPhone={patientPhone} visitId={visitId} totals={totals} patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub} cashierName={cashierName || doctorName} doctorName={doctorName} clinicLegalName={clinicLegalName} globalDiscountPercent={globalDiscountPercent} globalDiscountReason={globalDiscountReason} effectiveDmsId={dms.effectiveDmsId} effectiveDmsNumber={dms.effectiveDmsNumber} effectiveDmsInsurer={dms.effectiveDmsInsurer} effectiveDmsCoverage={dms.effectiveDmsCoverage} initialSplitDmsRub={initialSplitDmsRub} services={services} onPaymentSuccess={onPaymentSuccess} selectedBomService={selectedBomService} onCloseBomModal={() => setSelectedBomService(null)} isDmsModalOpen={isDmsModalOpen} onCloseDmsModal={() => setIsDmsModalOpen(false)} onSaveDmsLetter={(savedLetter) => { const maxCov = Number(savedLetter.maxCoverageRub || 0); const used = Number(savedLetter.usedAmountRub || 0); dms.setActiveDmsLetter({ id: savedLetter.id || "dms-letter-saved", letterNumber: savedLetter.letterNumber, insurerName: savedLetter.insurerName, availableCoverageRub: Math.max(0, maxCov - used) }); }} />
		</div>
	);
};

export default VisitServiceBillingWidget;
