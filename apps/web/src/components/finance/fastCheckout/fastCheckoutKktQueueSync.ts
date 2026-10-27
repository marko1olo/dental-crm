import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter";
import { showToast } from "../../GlobalToast";
import type { InterruptedPaymentState, KktHardwareStatusState } from "./types";

/** Проверяет состояние связи и наличие чековой ленты в сетевой ККТ (АТОЛ / Штрих-М) */
export async function checkFastCheckoutKktDeviceHealth(): Promise<KktHardwareStatusState> {
	try {
		const status = await KktLanPrinterService.checkDeviceHealth();
		return { online: status.online, paperOk: status.paperOk, error: status.error, isChecking: false };
	} catch {
		return { online: false, paperOk: false, error: "Кассовый аппарат временно недоступен в сети", isChecking: false };
	}
}

/** Подписывается на изменения количества отложенных чеков в очереди 54-ФЗ */
export function subscribeFastCheckoutOfflineQueue(onPendingCountChange: (pendingCount: number) => void): () => void {
	return FiscalReceiptQueueManager.subscribe((items) => {
		const pending = items.filter((i) => i.status === "pending_print" || i.status === "hardware_offline").length;
		onPendingCountChange(pending);
	});
}

/** Повторная прямая фискализация чека на ККТ без повторного списания баланса */
export async function executeRetryFiscalizationDirect(params: {
	readonly patientPhone: string;
	readonly patientEmail: string;
	readonly effectiveCashierFullName: string;
	readonly targetBillRub: number;
	readonly cashAmountRub: number;
	readonly cardAmountRub: number;
	readonly sbpAmountRub: number;
	readonly depositAmountRub: number;
	readonly loyaltyAmountRub: number;
	readonly setIsFlushingQueue: (val: boolean) => void;
	readonly setInterruptedPaymentState: (val: InterruptedPaymentState | null) => void;
}): Promise<void> {
	const { patientPhone, patientEmail, effectiveCashierFullName, targetBillRub, cashAmountRub, cardAmountRub, sbpAmountRub, depositAmountRub, loyaltyAmountRub, setIsFlushingQueue, setInterruptedPaymentState } = params;

	setIsFlushingQueue(true);
	try {
		const printResult = await KktLanPrinterService.printReceipt({
			operationType: "income",
			customerContact: patientPhone || patientEmail || "",
			cashierFullName: effectiveCashierFullName,
			totalRub: targetBillRub,
			items: [{ name: "Стоматологические услуги по плану лечения", priceRub: targetBillRub, quantity: 1, amountRub: targetBillRub, paymentMethod: "full_payment", paymentSubject: "service" }],
			cashRub: cashAmountRub,
			electronicRub: cardAmountRub + sbpAmountRub,
			prepaidRub: depositAmountRub + loyaltyAmountRub,
			taxationSystem: "usn_income_expense",
		});

		if (printResult.success) {
			showToast("Кассовый чек успешно фискализирован на ККТ без повторного изменения баланса!", "success", 4500);
			setInterruptedPaymentState(null);
		} else {
			const res = await FiscalReceiptQueueManager.flushAllPending();
			if (res.failedCount === 0 && res.printedCount > 0) {
				showToast(`Очередь фискализации успешно отправлена в ОФД (${res.printedCount} чеков)!`, "success");
				setInterruptedPaymentState(null);
			} else {
				showToast(printResult.error || "ККТ недоступна. Чек сохранён в очереди", "warning");
			}
		}
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : "Сбой связи при повторной фискализации";
		showToast(errMsg, "error");
	} finally {
		setIsFlushingQueue(false);
	}
}

/** Принудительная выгрузка всех отложенных чеков из офлайн-буфера в ККТ/ОФД */
export async function executeFlushOfflineFiscalQueue(setIsFlushingQueue: (val: boolean) => void): Promise<void> {
	setIsFlushingQueue(true);
	const res = await FiscalReceiptQueueManager.flushAllPending();
	setIsFlushingQueue(false);
	showToast(`Синхронизировано ${res.printedCount} из ${res.totalProcessed} чеков офлайн-буфера`, res.failedCount === 0 ? "success" : "warning");
}
