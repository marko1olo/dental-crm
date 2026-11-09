/**
 * apps/web/src/components/visit/VisitBillingModals.tsx
 * DENTE Dental CRM — Modular Modal Dialogs for Visit Billing (Payment, BOM Deduction, DMS)
 * Mandate 8b: File line limit decomposition.
 */

import React from "react";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal.js";
import { ConsumablesBatchWriteoffModal } from "../inventory/ConsumablesBatchWriteoffModal.js";
import { DmsGuaranteeLetterModal } from "../insurance/DmsGuaranteeLetterModal.js";
import { PricelistStudioModal } from "../catalog/PricelistStudioModal.js";
import type { PricelistClinicalBundle, PricelistStudioItem } from "../catalog/pricelistCatalogData.js";
import { showToast } from "../GlobalToast.js";
import type { VisitBillingServiceItem, VisitBillingTotals } from "./visitBillingTypes.js";

export interface VisitBillingModalsProps {
	isPaymentModalOpen: boolean;
	onClosePaymentModal: () => void;
	patientId: string;
	patientName: string;
	patientPhone: string;
	visitId?: string | undefined;
	totals: VisitBillingTotals;
	patientDepositRub: number;
	patientFamilyBalanceRub: number;
	cashierName?: string | undefined;
	doctorName: string;
	clinicLegalName: string;
	globalDiscountPercent: number;
	globalDiscountReason: string;
	effectiveDmsId?: string | undefined;
	effectiveDmsNumber?: string | undefined;
	effectiveDmsInsurer?: string | undefined;
	effectiveDmsCoverage: number;
	initialSplitDmsRub?: number | undefined;
	services: VisitBillingServiceItem[];
	onPaymentSuccess?: ((res: any) => void) | undefined;

	selectedBomService: VisitBillingServiceItem | null;
	onCloseBomModal: () => void;

	isDmsModalOpen: boolean;
	onCloseDmsModal: () => void;
	onSaveDmsLetter: (savedLetter: any) => void;

	isPricelistOpen?: boolean | undefined;
	onClosePricelist?: (() => void) | undefined;
	onApplyBundle?: ((bundle: PricelistClinicalBundle) => void) | undefined;
	onAddPricelistItem?: ((item: PricelistStudioItem) => void) | undefined;
}

export const VisitBillingModals: React.FC<VisitBillingModalsProps> = ({
	isPaymentModalOpen,
	onClosePaymentModal,
	patientId,
	patientName,
	patientPhone,
	visitId,
	totals,
	patientDepositRub,
	patientFamilyBalanceRub,
	cashierName,
	doctorName,
	clinicLegalName,
	globalDiscountPercent,
	globalDiscountReason,
	effectiveDmsId,
	effectiveDmsNumber,
	effectiveDmsInsurer,
	effectiveDmsCoverage,
	initialSplitDmsRub,
	services,
	onPaymentSuccess,
	selectedBomService,
	onCloseBomModal,
	isDmsModalOpen,
	onCloseDmsModal,
	onSaveDmsLetter,
	isPricelistOpen,
	onClosePricelist,
	onApplyBundle,
	onAddPricelistItem,
}) => {
	return (
		<>
			{/* Canonical Unified SSOT Cash Register Studio & 54-FZ (Cash, Card, SBP, Split, Deposit) */}
			{isPaymentModalOpen && (
				<CashRegisterStudioModal
					isOpen={isPaymentModalOpen}
					onClose={onClosePaymentModal}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					visitId={visitId}
					amountRub={totals.totalDueRub}
					patientDepositRub={patientDepositRub}
					patientFamilyBalanceRub={patientFamilyBalanceRub}
					cashierFullName={cashierName || doctorName}
					doctorFullName={doctorName}
					clinicLegalName={clinicLegalName}
					initialWarranty100={totals.isWarranty100}
					serviceTitle={services[0]?.title || "Стоматологические услуги"}
					onSuccess={(res) => {
						onClosePaymentModal();
						showToast("Оплата успешно принята в кассу!", "success", 3000);
						onPaymentSuccess?.(res);
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente:payment-completed", {
									detail: { visitId, patientId, result: res },
								})
							);
							window.dispatchEvent(
								new CustomEvent("dente:refresh-billing", {
									detail: { visitId, patientId },
								})
							);
						}
					}}
				/>
			)}

			{/* Chairside Consumables Deduction Modal (BOM per FEFO) */}
			{selectedBomService && (
				<ConsumablesBatchWriteoffModal
					isOpen={Boolean(selectedBomService)}
					onClose={onCloseBomModal}
					procedureTitle={selectedBomService.title}
					service804nCode={selectedBomService.code804n}
					doctorName={doctorName}
					patientName={patientName}
					toothNumber={selectedBomService.toothCode ? Number(selectedBomService.toothCode) || null : null}
					onConfirmDeduction={() => {
						onCloseBomModal();
						showToast("Расходные материалы успешно списаны со склада по FEFO", "success", 3000);
					}}
				/>
			)}

			{/* Chairside DMS Guarantee Letter Modal (Mandates 8e, 8n) */}
			{isDmsModalOpen && (
				<DmsGuaranteeLetterModal
					isOpen={isDmsModalOpen}
					onClose={onCloseDmsModal}
					patient={{
						id: patientId,
						fullName: patientName,
						phone: patientPhone,
					}}
					billItems={services.map((s, idx) => ({
						id: s.id || `item-${idx}`,
						serviceCode804n: s.code804n || "A16.07.002",
						serviceName: s.title,
						toothNumber: s.toothCode ? String(s.toothCode) : undefined,
						quantity: s.quantity || 1,
						unitPriceKopecks: Math.round((s.unitPriceRub || 0) * 100),
						discountPercent: s.discountPercent,
					}))}
					onSave={(savedLetter) => {
						onSaveDmsLetter(savedLetter);
					}}
				/>
			)}

			{/* Chairside Pricelist & Turnkey Bundles Studio (Mandate 8e/8n) */}
			{isPricelistOpen && (
				<PricelistStudioModal
					isOpen={isPricelistOpen}
					onClose={onClosePricelist || (() => {})}
					onApplyBundleToVisit={onApplyBundle}
					onAddServiceToInvoice={onAddPricelistItem}
					clinicName={clinicLegalName}
				/>
			)}
		</>
	);
};
