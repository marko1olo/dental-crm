/**
 * RefundReceiptModal.tsx — 1-Click 54-FZ Income Return ("Возврат прихода", Тег 1054 = 2) Modal.
 *
 * Mandate 8e: Doctor & Cashier Autonomy (Frictionless partial & full refunds).
 * Mandate 8b: Integer Kopeck Exactness (Zero float drift).
 * Mandate 8k: Friction-Killer Law (1-click 100% select all, 1-click advance refund).
 * Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Advance refund without mandatory treatment plan items).
 */

import React, { useMemo } from "react";
import type {
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "../treatment-plans/types";
import {
	FiscalReceipt54FzModal,
} from "./FiscalReceipt54FzModal";
import type { FiscalItemDraft } from "./fiscal/fiscal54fzEngine";
import type { FlexibleFiscalItem } from "./ExpressFiscalReceiptModal";

export interface RefundReceiptModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items?: readonly FlexibleFiscalItem[] | undefined;
	readonly originalReceiptNumber?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly refundReason?: string | undefined;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
}

export const RefundReceiptModal: React.FC<RefundReceiptModalProps> = ({
	isOpen,
	onClose,
	items = [],
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	onReceiptFiscalized,
}) => {
	const effectiveDepositRub = (patientDepositRub || 0) + (patientFamilyBalanceRub || 0);
	const adaptedItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		return items.map((item, idx) => {
			const candidate = item as Partial<FiscalItemDraft> & Partial<TreatmentPlanItem>;
			const qty = candidate.quantity ?? 1;
			const price = candidate.priceRub ?? candidate.unitPriceRub ?? 0;
			const unitPrice = candidate.unitPriceRub ?? (qty > 0 ? price / qty : price);
			return {
				id: candidate.id || `refund-item-${idx + 1}`,
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
	}, [items]);

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
			initialTab="refund"
			onClose={onClose}
			onReceiptFiscalized={onReceiptFiscalized}
		/>
	);
};

export default RefundReceiptModal;
