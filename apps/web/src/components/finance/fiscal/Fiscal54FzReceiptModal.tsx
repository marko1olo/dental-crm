/**
 * Fiscal54FzReceiptModal.tsx — 54-FZ FFD 1.2 Canonical Modal Adapter & Re-export.
 *
 * Consolidates the 54-FZ fiscal modal to use the single source of truth
 * FiscalReceipt54FzModal, avoiding code duplication across finance components.
 */

import React, { useMemo } from "react";
import type {
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "../../treatment-plans/types";
import {
	FiscalReceipt54FzModal,
	type FiscalModalTab,
	type FiscalReceipt54FzModalProps,
} from "../FiscalReceipt54FzModal";
import type { FiscalItemDraft } from "./fiscal54fzEngine";

export interface Fiscal54FzReceiptModalProps {
	readonly isOpen: boolean;
	readonly items?: readonly (FiscalItemDraft | TreatmentPlanItem)[] | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly initialOperationType?: "income" | "income_return" | undefined;
	readonly initialTab?: FiscalModalTab | undefined;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly defaultMethod?: any;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: ((receiptData: unknown) => void) | undefined;
}

export const Fiscal54FzReceiptModal: React.FC<Fiscal54FzReceiptModalProps> = ({
	isOpen,
	items = [],
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName,
	patientPhone,
	patientDepositRub,
	patientFamilyBalanceRub,
	familyPayerName,
	cashierFullName,
	clinicName,
	clinicInn,
	clinicLicense,
	initialOperationType,
	initialTab,
	totalDueRub,
	amountRub,
	totalBillRub,
	totalBillKop,
	patientDebtRub,
	defaultMethod,
	onClose,
	onReceiptFiscalized,
}) => {
	const adaptedItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		return (items || []).map((item, idx) => {
			const candidate = item as Partial<FiscalItemDraft> & Partial<TreatmentPlanItem>;
			const qty = candidate.quantity ?? 1;
			const rawPrice = candidate.priceRub ?? candidate.unitPriceRub ?? 0;
			const price = Math.round(rawPrice * 100) / 100;
			const rawUnitPrice = candidate.unitPriceRub ?? (qty > 0 ? price / qty : price);
			const unitPrice = Math.round(rawUnitPrice * 100) / 100;
			const discount = Math.round((candidate.discountRub ?? 0) * 100) / 100;
			return {
				id: candidate.id || `item-${idx + 1}`,
				name: candidate.name || "Медицинская услуга",
				code804n: candidate.code804n || "A16.07.002",
				toothNumber: candidate.toothFdiNumber ?? candidate.toothNumber ?? undefined,
				quantity: qty,
				unitPriceRub: unitPrice,
				priceRub: price,
				discountRub: discount,
				category: candidate.taxDeductionCategory === "2" ? "implantology" : (candidate.category || "therapy"),
				phase: typeof candidate.phase === "number" ? candidate.phase : 1,
				stageKind:
					candidate.stageKind && candidate.stageKind !== ("all" as string)
						? (candidate.stageKind as TreatmentPlanStageKind)
						: "stage_1_therapy",
				isWarranty: candidate.isWarranty,
				warrantyDiscountPercent: candidate.warrantyDiscountPercent,
				warrantyPriceRub: candidate.warrantyPriceRub,
			};
		});
	}, [items]);

	const effectiveInitialTab: FiscalModalTab =
		initialTab || (initialOperationType === "income_return" ? "refund" : "payment");

	return (
		<FiscalReceipt54FzModal
			isOpen={isOpen}
			items={adaptedItems}
			patientId={patientId}
			patientName={patientName}
			patientPhone={patientPhone}
			patientDepositRub={patientDepositRub}
			patientFamilyBalanceRub={patientFamilyBalanceRub}
			familyPayerName={familyPayerName}
			cashierFullName={cashierFullName}
			clinicName={clinicName}
			clinicInn={clinicInn}
			initialTab={effectiveInitialTab}
			totalDueRub={totalDueRub}
			amountRub={amountRub}
			totalBillRub={totalBillRub}
			totalBillKop={totalBillKop}
			patientDebtRub={patientDebtRub}
			defaultMethod={defaultMethod}
			onClose={onClose}
			onReceiptFiscalized={onReceiptFiscalized as ((num: string) => void) | undefined}
		/>
	);
};

export default Fiscal54FzReceiptModal;
export { FiscalReceipt54FzModal };
