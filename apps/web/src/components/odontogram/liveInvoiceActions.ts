import { showToast } from "../GlobalToast";
import { generateUuidV7, rublesToKopecks } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
import type {
	ClinicServiceCatalogEntry,
	LiveInvoiceCashierExport,
	LiveInvoiceItem,
} from "./odontogramLiveInvoiceCalculations";
import type { ToothData } from "./ToothChart";

export interface UseLiveInvoiceStateParams {
	readonly teethData: readonly ToothData[];
	readonly clinicServiceCatalog?: readonly ClinicServiceCatalogEntry[] | undefined;
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

export async function exportLiveInvoiceToCashier({
	baseItems,
	grossTotalPrice,
	totalDiscountRub,
	netTotalPrice,
	discountPercent,
	patientId,
	patientName,
	onCreateInvoice,
}: LiveInvoiceExportParams): Promise<void> {
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
		grossTotalKopecks: rublesToKopecks(grossTotalPrice),
		discountKopecks: rublesToKopecks(totalDiscountRub),
		netTotalKopecks: rublesToKopecks(netTotalPrice),
		discountPercent,
		createdAtIso: new Date().toISOString(),
	};

	if (onCreateInvoice) {
		onCreateInvoice(invoiceData);
		showToast(
			`Счет на ${netTotalPrice.toLocaleString("ru-RU")} ₽ выставлен кассиру!`,
			"success",
			5000,
		);
		return;
	}

	if (patientId) {
		try {
			const mutationId = generateUuidV7();
			const invoicePayload = {
				patientId,
				totalAmountRub: netTotalPrice,
				totalAmountKopecks: rublesToKopecks(netTotalPrice),
				discountRub: totalDiscountRub,
				discountPercent,
				clientMutationId: mutationId,
				items: baseItems.map((item) => ({
					nameRu: item.title,
					title: item.title,
					code804n: item.code,
					toothNumber: item.toothNumber,
					toothCode: String(item.toothNumber),
					priceKopecks: item.amountKopecks,
					priceRub: item.price,
					unitPriceRub: item.price,
					quantity: item.quantity,
					discountRub: item.discountRub ?? 0,
					discountPercent,
					totalRub: item.price * item.quantity - (item.discountRub ?? 0),
				})),
				notes: `Живая смета одонтограммы (${baseItems.length} поз.)`,
			};

			const response = await fetch("/api/invoices", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": mutationId,
				}),
				body: JSON.stringify(invoicePayload),
			});

			if (!response.ok) {
				let errJson: { message?: string } = {};
				try {
					errJson = (await response.json()) as { message?: string };
				} catch (parseErr) {
					clientLogger.warn("[liveInvoiceActions] Invoice error JSON parse failed", {
						status: response.status,
						error: String(parseErr),
					});
				}
				throw new Error(errJson.message || `Ошибка сервера: ${response.status}`);
			}

			showToast(
				`Счет на ${netTotalPrice.toLocaleString("ru-RU")} ₽ выставлен в кассу и сохранен в базе!`,
				"success",
				5000,
			);
			return;
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			showToast(`Не удалось создать счёт: ${errMsg}`, "error", 5000);
			return;
		}
	}

	showToast(
		`Счет на ${netTotalPrice.toLocaleString("ru-RU")} ₽ сформирован (пациент не выбран)`,
		"info",
		4000,
	);
}
