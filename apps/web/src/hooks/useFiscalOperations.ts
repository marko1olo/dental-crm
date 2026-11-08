/**
 * useFiscalOperations.ts
 *
 * DENTE Dental CRM — 54-FZ Fiscal Operations & Hardware Queue Hook.
 * Governed by Mandate 8e (Doctor & Cashier Autonomy) and Mandate 8bi.
 *
 * Consolidates around canonical FiscalReceiptQueueManager (SSOT).
 */

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../components/GlobalToast.js";
import { FiscalReceiptQueueManager } from "../services/hardware/fiscalReceiptQueueManager.js";
import type { QueuedFiscalReceiptItem, FiscalReceiptPrintPayload } from "../services/hardware/hardwareTypes.js";

export type OfflineFiscalReceipt = QueuedFiscalReceiptItem;

export interface FiscalOperationInput {
	visitId?: string;
	paymentId?: string;
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary fiscal payload
	payload: any;
	amountRub?: number;
	clientMutationId?: string;
}

export interface FiscalOperationResult {
	success: boolean;
	isOfflineQueued: boolean;
	receiptId?: string;
	message: string;
	error?: string;
}

export function useFiscalOperations() {
	const [isOnline, setIsOnline] = useState<boolean>(() => {
		return typeof navigator !== "undefined" ? navigator.onLine : true;
	});

	const [pendingReceipts, setPendingReceipts] = useState<QueuedFiscalReceiptItem[]>(() => {
		return FiscalReceiptQueueManager.getPendingItems();
	});
	const [isSyncing, setIsSyncing] = useState<boolean>(false);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			void FiscalReceiptQueueManager.flushAllPending();
		};
		const handleOffline = () => setIsOnline(false);

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
		}

		FiscalReceiptQueueManager.startAutoRetryLoop(15000);

		const unsubscribe = FiscalReceiptQueueManager.subscribe(() => {
			setPendingReceipts(FiscalReceiptQueueManager.getPendingItems());
		});

		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			}
			unsubscribe();
		};
	}, []);

	const queueOfflineReceipt = useCallback(
		async (input: FiscalOperationInput, reason?: string): Promise<QueuedFiscalReceiptItem> => {
			const rawPayload = input.payload || {};
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: rawPayload.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: rawPayload.cashierFullName || "Кассир",
				customerContact: rawPayload.customerContact || rawPayload.clientContact || "",
				operationType: rawPayload.operationType || "income",
				// biome-ignore lint/suspicious/noExplicitAny: arbitrary item payload
				items: (rawPayload.items || []).map((it: any) => ({
					name: it.name || "Стоматологическая услуга",
					priceRub: it.priceRub || (it.priceKopecks ? it.priceKopecks / 100 : 0),
					quantity: it.quantity || 1,
					amountRub: it.amountRub || (it.amountKopecks ? it.amountKopecks / 100 : 0),
					vatRate: "vat_0",
				})),
				totalRub: input.amountRub ?? rawPayload.totalRub ?? (rawPayload.totalKopecks ? rawPayload.totalKopecks / 100 : 0),
				electronicRub: rawPayload.electronicRub || (rawPayload.payments?.cardRub || 0),
				cashRub: rawPayload.cashRub || (rawPayload.payments?.cashRub || 0),
				sbpRub: rawPayload.sbpRub || (rawPayload.payments?.sbpRub || 0),
				prepaidRub: rawPayload.prepaidRub || 0,
				visitId: input.visitId || rawPayload.visitId,
			};

			const item = FiscalReceiptQueueManager.enqueueReceipt(
				printPayload,
				reason || (!isOnline ? "Отсутствует сетевое подключение" : "Сбой сетевого запроса к ОФД"),
				input.clientMutationId,
			);

			showToast(
				"Оплачено (Ожидает фискализации в очереди)",
				"info",
				5000,
			);

			return item;
		},
		[isOnline],
	);

	const executeFiscalOperation = useCallback(
		async (
			input: FiscalOperationInput,
			onlineOperation: () => Promise<void | Response | unknown>,
		): Promise<FiscalOperationResult> => {
			if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) {
				const item = await queueOfflineReceipt(
					input,
					"Офлайн-режим: касса сохранена в локальный буфер",
				);
				return {
					success: true,
					isOfflineQueued: true,
					receiptId: item.id,
					message: "Оплата зафиксирована, чек в очереди фискализации",
				};
			}

			try {
				await onlineOperation();
				return {
					success: true,
					isOfflineQueued: false,
					message: "Чек успешно фискализирован",
				};
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const item = await queueOfflineReceipt(input, errorMsg);
				return {
					success: true,
					isOfflineQueued: true,
					receiptId: item.id,
					message: "Оплата зафиксирована, чек в очереди фискализации",
					error: errorMsg,
				};
			}
		},
		[isOnline, queueOfflineReceipt],
	);

	const syncQueue = useCallback(async () => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			const result = await FiscalReceiptQueueManager.flushAllPending();
			if (result.printedCount > 0) {
				showToast(
					`Синхронизировано чеков из очереди: ${result.printedCount}`,
					"success",
					4000,
				);
			}
			return {
				syncedCount: result.printedCount,
				failedCount: result.failedCount,
				total: result.totalProcessed,
			};
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing]);

	return {
		isOnline,
		pendingCount: pendingReceipts.length,
		pendingReceipts,
		hasPendingReceipts: pendingReceipts.length > 0,
		isSyncing,
		queueOfflineReceipt,
		executeFiscalOperation,
		syncQueue,
	};
}

export default useFiscalOperations;
