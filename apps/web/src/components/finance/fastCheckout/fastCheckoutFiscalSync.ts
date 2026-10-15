import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter";
import { showToast } from "../../GlobalToast";
import {
	type FiscalExecutionParams,
	type ManualCardTerminalParams,
	executeFiscalPayment,
	executeManualCardTerminalConfirm,
} from "../fastCheckoutFiscalHandlers";
import type {
	InterruptedPaymentState,
	KktHardwareStatusState,
	SbpPaymentCheckStatus,
	SbpQrGeneratedData,
} from "./types";

export {
	type FiscalExecutionParams,
	type ManualCardTerminalParams,
	executeFiscalPayment,
	executeManualCardTerminalConfirm,
};

/** Проверяет состояние связи и наличие чековой ленты в сетевой ККТ (АТОЛ / Штрих-М) */
export async function checkFastCheckoutKktDeviceHealth(): Promise<KktHardwareStatusState> {
	try {
		const status = await KktLanPrinterService.checkDeviceHealth();
		return {
			online: status.online,
			paperOk: status.paperOk,
			error: status.error,
			isChecking: false,
		};
	} catch {
		return {
			online: false,
			paperOk: false,
			error: "Кассовый аппарат временно недоступен в сети",
			isChecking: false,
		};
	}
}

/** Подписывается на изменения количества отложенных чеков в очереди 54-ФЗ */
export function subscribeFastCheckoutOfflineQueue(
	onPendingCountChange: (pendingCount: number) => void
): () => void {
	return FiscalReceiptQueueManager.subscribe((items) => {
		const pending = items.filter(
			(i) => i.status === "pending_print" || i.status === "hardware_offline"
		).length;
		onPendingCountChange(pending);
	});
}

/** Опрашивает статус оплаты по динамическому QR-коду СБП НСПК */
export async function executeCheckSbpStatus(params: {
	readonly isCheckingSbp: boolean;
	readonly sbpStatus: SbpPaymentCheckStatus;
	readonly effectiveSbpKopecks: number;
	readonly effectiveSbpOrderId: string;
	readonly sbpQrData: SbpQrGeneratedData | null;
	readonly manual: boolean;
	readonly setIsCheckingSbp: (val: boolean) => void;
	readonly setSbpStatus: (val: SbpPaymentCheckStatus) => void;
	readonly setSbpCheckMessage: (val: string | null) => void;
	readonly onPaidConfirmed: () => Promise<void>;
}): Promise<void> {
	const {
		isCheckingSbp,
		sbpStatus,
		effectiveSbpKopecks,
		effectiveSbpOrderId,
		sbpQrData,
		manual,
		setIsCheckingSbp,
		setSbpStatus,
		setSbpCheckMessage,
		onPaidConfirmed,
	} = params;

	if (isCheckingSbp || sbpStatus === "paid" || effectiveSbpKopecks <= 0) return;
	setIsCheckingSbp(true);
	try {
		const headers = denteAdminSecretRequestHeaders({ Accept: "application/json" });
		const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveSbpOrderId)}&qrId=${encodeURIComponent(sbpQrData?.payload.qrId || "")}&sumKop=${effectiveSbpKopecks}`;
		const res = await fetch(queryUrl, { headers });
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as {
				paid?: boolean;
				status?: string;
			} | null;
			if (data && (data.paid || data.status === "paid")) {
				setSbpStatus("paid");
				setSbpCheckMessage(
					"Оплата по СБП подтверждена банком! Формируем фискальный чек..."
				);
				showToast(
					"Оплата через СБП подтверждена! Кассовый чек сформирован.",
					"success"
				);
				await onPaidConfirmed();
				return;
			}
		}
		if (manual) {
			setSbpCheckMessage(
				"Платёж через СБП пока не поступил. Ожидается проведение банком."
			);
			showToast("Платёж пока не поступил от банка", "info");
		}
	} catch {
		if (manual) {
			setSbpCheckMessage(
				"Шлюз СБП временно недоступен. Проверьте банковскую выписку."
			);
		}
	} finally {
		setIsCheckingSbp(false);
	}
}

/** Ручное подтверждение поступления средств по СБП кассиром/врачом */
export async function executeConfirmSbpManual(params: {
	readonly effectiveSbpOrderId: string;
	readonly sbpQrData: SbpQrGeneratedData | null;
	readonly effectiveSbpKopecks: number;
	readonly setIsCheckingSbp: (val: boolean) => void;
	readonly setSbpStatus: (val: SbpPaymentCheckStatus) => void;
	readonly setSbpCheckMessage: (val: string | null) => void;
	readonly onPaidConfirmed: () => Promise<void>;
}): Promise<void> {
	const {
		effectiveSbpOrderId,
		sbpQrData,
		effectiveSbpKopecks,
		setIsCheckingSbp,
		setSbpStatus,
		setSbpCheckMessage,
		onPaidConfirmed,
	} = params;

	setIsCheckingSbp(true);
	try {
		const headers = denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
			Accept: "application/json",
		});
		await fetch("/api/fiscal/sbp-status", {
			method: "POST",
			headers,
			body: JSON.stringify({
				orderId: effectiveSbpOrderId,
				qrId: sbpQrData?.payload.qrId,
				action: "confirm_manual",
				sumKopecks: effectiveSbpKopecks,
			}),
		}).catch(() => null);

		setSbpStatus("paid");
		setSbpCheckMessage(
			"Поступление средств по СБП подтверждено кассиром. Формируем кассовый чек..."
		);
		showToast(
			"Оплата СБП подтверждена кассиром! Печатаем кассовый чек...",
			"success"
		);
		await onPaidConfirmed();
	} catch {
		setSbpStatus("paid");
		await onPaidConfirmed();
	} finally {
		setIsCheckingSbp(false);
	}
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
	readonly setInterruptedPaymentState: (
		val: InterruptedPaymentState | null
	) => void;
}): Promise<void> {
	const {
		patientPhone,
		patientEmail,
		effectiveCashierFullName,
		targetBillRub,
		cashAmountRub,
		cardAmountRub,
		sbpAmountRub,
		depositAmountRub,
		loyaltyAmountRub,
		setIsFlushingQueue,
		setInterruptedPaymentState,
	} = params;

	setIsFlushingQueue(true);
	try {
		const printResult = await KktLanPrinterService.printReceipt({
			operationType: "income",
			customerContact: patientPhone || patientEmail || "",
			cashierFullName: effectiveCashierFullName,
			totalRub: targetBillRub,
			items: [
				{
					name: "Стоматологические услуги по плану лечения",
					priceRub: targetBillRub,
					quantity: 1,
					amountRub: targetBillRub,
					paymentMethod: "full_payment",
					paymentSubject: "service",
				},
			],
			cashRub: cashAmountRub,
			electronicRub: cardAmountRub + sbpAmountRub,
			prepaidRub: depositAmountRub + loyaltyAmountRub,
			taxationSystem: "usn_income_expense",
		});

		if (printResult.success) {
			showToast(
				"Кассовый чек успешно фискализирован на ККТ без повторного изменения баланса!",
				"success",
				4500
			);
			setInterruptedPaymentState(null);
		} else {
			const res = await FiscalReceiptQueueManager.flushAllPending();
			if (res.failedCount === 0 && res.printedCount > 0) {
				showToast(
					`Очередь фискализации успешно отправлена в ОФД (${res.printedCount} чеков)!`,
					"success"
				);
				setInterruptedPaymentState(null);
			} else {
				showToast(
					printResult.error || "ККТ недоступна. Чек сохранён в очереди",
					"warning"
				);
			}
		}
	} catch (err: unknown) {
		const errMsg =
			err instanceof Error
				? err.message
				: "Сбой связи при повторной фискализации";
		showToast(errMsg, "error");
	} finally {
		setIsFlushingQueue(false);
	}
}

/** Принудительная выгрузка всех отложенных чеков из офлайн-буфера в ККТ/ОФД */
export async function executeFlushOfflineFiscalQueue(
	setIsFlushingQueue: (val: boolean) => void
): Promise<void> {
	setIsFlushingQueue(true);
	const res = await FiscalReceiptQueueManager.flushAllPending();
	setIsFlushingQueue(false);
	showToast(
		`Синхронизировано ${res.printedCount} из ${res.totalProcessed} чеков офлайн-буфера`,
		res.failedCount === 0 ? "success" : "warning"
	);
}
