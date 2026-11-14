import React from "react";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal.js";
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

	const serviceTitle = baseItems.length > 0
		? baseItems.map((b) => b.title).join(", ")
		: undefined;

	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			mode="checkout"
			initialTab="checkout"
			totalDueRub={netTotalPrice}
			amountRub={netTotalPrice}
			patientId={patientId || "patient-001"}
			patientName={patientName || "Пациент"}
			serviceTitle={serviceTitle}
			onClose={onClose}
			onSuccess={() => {
				showToast(
					`Оплата на сумму ${netTotalPrice.toLocaleString("ru-RU")} ₽ успешно проведена`,
					"success",
				);
				onClose();
			}}
		/>
	);
};
