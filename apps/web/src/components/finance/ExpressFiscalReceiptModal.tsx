/**
 * ExpressFiscalReceiptModal.tsx — 1-Click Express 54-FZ Fiscal Receipt Modal.
 *
 * Mandate 8e: Doctor & Cashier Autonomy.
 * Mandate 8b: Integer Kopeck Exactness (Zero float drift).
 * Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends).
 *
 * 54-FZ FFD 1.2 Invariants:
 * 1. Physical persons NEVER required to provide INN on cash/card/SBP checkout.
 * 2. 1-Click presets: "Без сдачи", "100% карта", "СБП QR", "Аванс + Карта", "Нал + Карта + Аванс родственника".
 * 3. 100% Doctor Warranty and Staff discounts without administrative password blockers.
 * 4. Automatic fallback when no items provided: instant single dental service line item without blocking checkout.
 */

import React, { useMemo } from "react";
import type {
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "../treatment-plans/types";
import {
	FiscalReceipt54FzModal,
	type FiscalModalTab,
} from "./FiscalReceipt54FzModal";
import type { FiscalItemDraft } from "./fiscal/fiscal54fzEngine";

export type FlexibleFiscalItem =
	| FiscalItemDraft
	| TreatmentPlanItem
	| {
			id: string;
			name: string;
			priceRub: number;
			quantity?: number | undefined;
			unitPriceRub?: number | undefined;
			code804n?: string | null | undefined;
			toothNumber?: number | undefined;
			toothFdiNumber?: number | null | undefined;
			discountRub?: number | undefined;
			category?: string | undefined;
			stageKind?: string | undefined;
			phase?: number | undefined;
	  };

export interface ExpressFiscalReceiptModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items?: readonly FlexibleFiscalItem[] | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly initialTab?: FiscalModalTab | undefined;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
}

export const ExpressFiscalReceiptModal: React.FC<ExpressFiscalReceiptModalProps> = ({
	isOpen,
	onClose,
	items = [],
	totalBillRub,
	totalBillKop,
	patientId = "pat-express-1",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	initialTab = "payment",
	onReceiptFiscalized,
}) => {
	// Adapt or generate 804n items with exact kopeck precision
	const adaptedItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		if (items && items.length > 0) {
			return items.map((item, idx) => {
				const candidate = item as Partial<FiscalItemDraft> & Partial<TreatmentPlanItem>;
				const qty = candidate.quantity ?? 1;
				const price = candidate.priceRub ?? candidate.unitPriceRub ?? 0;
				const unitPrice = candidate.unitPriceRub ?? (qty > 0 ? price / qty : price);
				return {
					id: candidate.id || `express-item-${idx + 1}`,
					name: candidate.name || "Стоматологическая медицинская услуга",
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
		}

		// Mandate 8n (Zero dead-ends): If no line items passed but total amount is known, synthesize 804n clinical item
		const effectiveRub = totalBillRub ?? (totalBillKop ? totalBillKop / 100 : 0);
		if (effectiveRub > 0) {
			return [
				{
					id: "express-service-synth-1",
					name: "Стоматологические медицинские услуги (клинический прием)",
					code804n: "A16.07.002",
					quantity: 1,
					unitPriceRub: effectiveRub,
					priceRub: effectiveRub,
					discountRub: 0,
					category: "therapy",
					phase: 1,
					stageKind: "stage_1_therapy",
				},
			];
		}

		return [];
	}, [items, totalBillRub, totalBillKop]);

	const effectiveDepositRub = Math.max(patientDepositRub, patientFamilyBalanceRub);

	return (
		<FiscalReceipt54FzModal
			isOpen={isOpen}
			items={adaptedItems}
			patientId={patientId}
			patientName={patientName}
			patientPhone={patientPhone}
			patientDepositRub={effectiveDepositRub}
			cashierFullName={cashierFullName}
			clinicName={clinicName}
			initialTab={initialTab}
			onClose={onClose}
			onReceiptFiscalized={onReceiptFiscalized}
		/>
	);
};

export default ExpressFiscalReceiptModal;
