import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager.js";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter.js";
import { showToast } from "../../GlobalToast.js";
import type { FiscalExecutionItem, FiscalReceiptPayload } from "./types.js";

export interface FiscalPrintParams {
	targetBillRub: number;
	customerContact: string;
	cashierFullName: string;
	payload: FiscalReceiptPayload;
	effectiveSbpRub: number;
	compositeIdempotencyKey: string;
	isElectronicReceiptOnly: boolean;
	fdSuffix: string;
	items?: readonly FiscalExecutionItem[] | undefined;
}

export function buildReceiptQueueItem(params: {
	customerContact: string;
	cashierFullName: string;
	totalRub: number;
	payload: FiscalReceiptPayload;
	effectiveSbpRub?: number | undefined;
	items?: readonly FiscalExecutionItem[] | undefined;
}) {
	const rawItems = params.items && params.items.length > 0 ? params.items : null;
	const lineItems = rawItems
		? rawItems.map((it) => {
				const qty = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
				const priceRub =
					typeof it.priceRub === "number"
						? it.priceRub
						: typeof it.priceKopecks === "number"
							? it.priceKopecks / 100
							: params.totalRub;
				const amountRub =
					typeof it.amountRub === "number"
						? it.amountRub
						: typeof it.amountKopecks === "number"
							? it.amountKopecks / 100
							: priceRub * qty;
				return {
					name: String(it.name || "Стоматологические услуги по плану лечения"),
					priceRub,
					quantity: qty,
					amountRub,
					paymentMethod: (it.method || "full_payment") as
						| "full_payment"
						| "advance"
						| "prepayment"
						| "full_prepayment",
					paymentSubject: (it.subject === "commodity"
						? "commodity"
						: it.subject === "marked"
							? "goods_with_marking"
							: "service") as "service" | "commodity" | "goods_with_marking",
					vatRate: it.vatRate,
					medicalServiceCode804n: it.medicalServiceCode804n,
					markingCode: it.markingCode,
				};
			})
		: [
				{
					name: "Стоматологические услуги по плану лечения",
					priceRub: params.totalRub,
					quantity: 1,
					amountRub: params.totalRub,
					paymentMethod: "full_payment" as const,
					paymentSubject: "service" as const,
				},
			];

	return {
		operationType: "income" as const,
		customerContact: params.customerContact,
		cashierFullName: params.cashierFullName,
		totalRub: params.totalRub,
		items: lineItems,
		cashRub: params.payload.paymentsDistribution.cashKop / 100,
		electronicRub: params.payload.paymentsDistribution.electronicKop / 100,
		sbpRub: params.effectiveSbpRub && params.effectiveSbpRub > 0 ? params.effectiveSbpRub : undefined,
		prepaidRub: params.payload.paymentsDistribution.advancePrepaymentKop / 100,
		taxationSystem: "usn_income_expense" as const,
	};
}

export async function printOrQueueFiscalReceipt(params: FiscalPrintParams): Promise<{
	isBuffered: boolean;
	success: boolean;
}> {
	const queueItem = buildReceiptQueueItem({
		customerContact: params.customerContact,
		cashierFullName: params.cashierFullName,
		totalRub: params.targetBillRub,
		payload: params.payload,
		effectiveSbpRub: params.effectiveSbpRub,
		items: params.items,
	});

	try {
		const printResult = await KktLanPrinterService.printReceipt(queueItem);

		if (!printResult.success || printResult.status === "hardware_offline") {
			FiscalReceiptQueueManager.enqueueReceipt(
				queueItem,
				printResult.error || "ККТ временно недоступна / нет бумаги",
				params.compositeIdempotencyKey,
			);
			showToast(
				`ККТ временно офлайн: чек${params.fdSuffix} помещён в буфер отложенной фискализации. Пациент отпущен без задержек!`,
				"warning",
			);
			return { isBuffered: true, success: false };
		}

		if (params.isElectronicReceiptOnly) {
			showToast(
				`Электронный чек${params.fdSuffix} отправлен на ${params.customerContact || "контакт пациента"} (бумага сэкономлена)!`,
				"success",
			);
		} else {
			showToast(
				`Кассовый чек${params.fdSuffix} успешно напечатан на сумму ${params.targetBillRub.toLocaleString("ru-RU")} ₽!`,
				"success",
			);
		}
		return { isBuffered: false, success: true };
	} catch (err: unknown) {
		FiscalReceiptQueueManager.enqueueReceipt(
			queueItem,
			err instanceof Error ? err.message : "Аварийный сбой связи с ККТ",
			params.compositeIdempotencyKey,
		);
		showToast(
			"ККТ не отвечает: чек сохранен в локальный буфер отложенной фискализации. Пациент отпущен!",
			"warning",
		);
		return { isBuffered: true, success: false };
	}
}
