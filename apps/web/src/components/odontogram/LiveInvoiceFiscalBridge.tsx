import type React from "react";
import { FiscalReceipt54FzModal } from "../finance/FiscalReceipt54FzModal";
import { showToast } from "../GlobalToast";
import type { LiveInvoiceItem } from "./odontogramLiveInvoiceCalculations";

export interface LiveInvoiceFiscalBridgeProps {
	readonly isOpen: boolean;
	readonly baseItems: readonly LiveInvoiceItem[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly netTotalPrice: number;
	readonly onClose: () => void;
}

export const LiveInvoiceFiscalBridge: React.FC<
	LiveInvoiceFiscalBridgeProps
> = ({ isOpen, baseItems, patientId, patientName, netTotalPrice, onClose }) => {
	if (!isOpen) return null;

	return (
		<FiscalReceipt54FzModal
			isOpen={isOpen}
			items={baseItems.map((it, idx) => ({
				id: `live-inv-${idx}-${it.toothNumber}`,
				toothNumber: it.toothNumber,
				code804n: it.code,
				name: it.title,
				category: it.category,
				unitPriceRub: it.price,
				priceRub: it.price * it.quantity - (it.discountRub || 0),
				quantity: it.quantity,
				discountRub: it.discountRub || 0,
				phase: 1,
				stageKind: "stage_1_therapy" as const,
			}))}
			patientId={patientId || "patient-001"}
			patientName={patientName || "Пациент"}
			onClose={onClose}
			onReceiptFiscalized={(receiptNum) => {
				showToast(
					`Чек №${receiptNum} на сумму ${netTotalPrice.toLocaleString("ru-RU")} ₽ успешно пробит`,
					"success",
				);
			}}
		/>
	);
};
