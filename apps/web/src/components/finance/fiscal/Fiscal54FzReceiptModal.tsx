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
	readonly items: readonly (FiscalItemDraft | TreatmentPlanItem)[];
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly initialOperationType?: "income" | "income_return" | undefined;
	readonly initialTab?: FiscalModalTab | undefined;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: ((receiptData: unknown) => void) | undefined;
}

export const Fiscal54FzReceiptModal: React.FC<Fiscal54FzReceiptModalProps> = ({
	isOpen,
	items,
	patientId,
	patientName,
	patientPhone,
	patientDepositRub,
	cashierFullName,
	clinicName,
	initialOperationType,
	initialTab,
	onClose,
	onReceiptFiscalized,
}) => {
	const adaptedItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		return items.map((item, idx) => {
			const candidate = item as Partial<FiscalItemDraft> & Partial<TreatmentPlanItem>;
			const qty = candidate.quantity ?? 1;
			const price = candidate.priceRub ?? candidate.unitPriceRub ?? 0;
			const unitPrice = candidate.unitPriceRub ?? (qty > 0 ? price / qty : price);
			return {
				id: candidate.id || `item-${idx + 1}`,
				name: candidate.name || "Медицинская услуга",
				code804n: candidate.code804n || "A16.07.002",
				toothNumber: candidate.toothFdiNumber ?? candidate.toothNumber ?? undefined,
				quantity: qty,
				unitPriceRub: unitPrice,
				priceRub: price,
				discountRub: candidate.discountRub ?? 0,
				category: candidate.taxDeductionCategory === "2" ? "implantology" : (candidate.category || "therapy"),
				phase: typeof candidate.phase === "number" ? candidate.phase : 1,
				stageKind:
					candidate.stageKind && candidate.stageKind !== ("all" as string)
						? (candidate.stageKind as TreatmentPlanStageKind)
						: "stage_1_therapy",
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
			cashierFullName={cashierFullName}
			clinicName={clinicName}
			initialTab={effectiveInitialTab}
			onClose={onClose}
			onReceiptFiscalized={onReceiptFiscalized as ((num: string) => void) | undefined}
		/>
	);
};

export default Fiscal54FzReceiptModal;
export { FiscalReceipt54FzModal };
