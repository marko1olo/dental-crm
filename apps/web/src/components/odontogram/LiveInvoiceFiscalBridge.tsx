import React from "react";
import { rublesToKopecks } from "@dental/shared";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal";
import { showToast } from "../GlobalToast";
import type { LiveInvoiceItem } from "./odontogramLiveInvoiceCalculations";

export interface LiveInvoiceFiscalBridgeProps {
	readonly isOpen: boolean;
	readonly baseItems: readonly LiveInvoiceItem[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly netTotalPrice: number;
	readonly netTotalKopecks?: bigint | number | undefined;
	readonly onClose: () => void;
}

export const LiveInvoiceFiscalBridge: React.FC<
	LiveInvoiceFiscalBridgeProps
> = ({ isOpen, baseItems, patientId, patientName, netTotalPrice, netTotalKopecks, onClose }) => {
	if (!isOpen) return null;

	if (!patientId) {
		showToast("Для проведения оплаты привяжите пациента к приёму", "warning");
		onClose();
		return null;
	}

	const serviceTitle = baseItems.length > 0
		? baseItems.map((b) => b.title).join(", ")
		: undefined;

	const effectiveKopecks =
		netTotalKopecks !== undefined
			? BigInt(netTotalKopecks)
			: rublesToKopecks(netTotalPrice);

	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			mode="checkout"
			initialTab="checkout"
			totalDueRub={netTotalPrice}
			totalDueKopecks={effectiveKopecks}
			amountRub={netTotalPrice}
			amountKopecks={effectiveKopecks}
			patientId={patientId}
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
