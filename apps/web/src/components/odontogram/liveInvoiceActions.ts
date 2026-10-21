import { showToast } from "../GlobalToast";
import type {
	LiveInvoiceCashierExport,
	LiveInvoiceItem,
} from "./odontogramLiveInvoiceCalculations";
import type { ToothData } from "./ToothChart";

export interface UseLiveInvoiceStateParams {
	readonly teethData: readonly ToothData[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly onGenerateTreatmentPlan?:
		| ((items: LiveInvoiceItem[]) => void)
		| undefined;
	readonly onCreateInvoice?:
		| ((invoice: LiveInvoiceCashierExport) => void)
		| undefined;
}

export interface LiveInvoiceExportParams {
	readonly baseItems: readonly LiveInvoiceItem[];
	readonly netTotalPrice: number;
	readonly grossTotalPrice: number;
	readonly totalDiscountRub: number;
	readonly discountPercent: number;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly onGenerateTreatmentPlan?:
		| ((items: LiveInvoiceItem[]) => void)
		| undefined;
	readonly onCreateInvoice?:
		| ((invoice: LiveInvoiceCashierExport) => void)
		| undefined;
}

export function exportLiveInvoiceToPlan({
	baseItems,
	netTotalPrice,
	onGenerateTreatmentPlan,
}: Pick<
	LiveInvoiceExportParams,
	"baseItems" | "netTotalPrice" | "onGenerateTreatmentPlan"
>): void {
	if (baseItems.length === 0) {
		showToast("Смета пуста: нет позиций для экспорта", "warning", 3000);
		return;
	}
	onGenerateTreatmentPlan?.([...baseItems]);
	showToast(
		`Смета экспортирована в план: ${baseItems.length} поз. на ${netTotalPrice.toLocaleString("ru-RU")} ₽`,
		"success",
		4000,
	);
}

export function exportLiveInvoiceToCashier({
	baseItems,
	grossTotalPrice,
	totalDiscountRub,
	netTotalPrice,
	discountPercent,
	patientId,
	patientName,
	onCreateInvoice,
}: LiveInvoiceExportParams): void {
	if (baseItems.length === 0) {
		showToast("Смета пуста: отметьте зубы на формуле", "warning", 3000);
		return;
	}
	const invoiceData: LiveInvoiceCashierExport = {
		...(patientId ? { patientId } : {}),
		...(patientName ? { patientName } : {}),
		items: [...baseItems],
		grossTotalRub: grossTotalPrice,
		discountRub: totalDiscountRub,
		netTotalRub: netTotalPrice,
		discountPercent,
		createdAtIso: new Date().toISOString(),
	};
	onCreateInvoice?.(invoiceData);
	showToast(
		`Счет на ${netTotalPrice.toLocaleString("ru-RU")} ₽ выставлен кассиру!`,
		"success",
		5000,
	);
}
