/**
 * useFiscalOperations.ts
 *
 * DENTE Dental CRM — 54-FZ Fiscal Operations & Hardware Queue Hook.
 * Governed by Mandate 8e (Doctor & Cashier Autonomy) and Mandate 8bi.
 *
 * Consolidates around canonical FiscalReceiptQueueManager (SSOT).
 */

import { useCallback, useEffect, useState } from "react";
import { kopecksToRubles } from "@dental/shared";
import { showToast } from "../components/GlobalToast.js";
import { FiscalReceiptQueueManager } from "../services/hardware/fiscalReceiptQueueManager.js";
import type { QueuedFiscalReceiptItem, FiscalReceiptPrintPayload } from "../services/hardware/hardwareTypes.js";

export type OfflineFiscalReceipt = QueuedFiscalReceiptItem;

export interface FiscalOperationInput {
	visitId?: string;
	paymentId?: string;
	payload: FiscalReceiptPrintPayload | Record<string, unknown>;
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
			const p = input.payload as unknown as Record<string, unknown>;
			const rawItems = Array.isArray(p.items) ? p.items : [];
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: typeof p.clinicName === "string" ? p.clinicName : "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: typeof p.cashierFullName === "string" ? p.cashierFullName : "Кассир",
				customerContact: typeof p.customerContact === "string" ? p.customerContact : typeof p.clientContact === "string" ? p.clientContact : "",
				operationType: p.operationType === "income_return" || p.operationType === "expense" || p.operationType === "expense_return" ? p.operationType : "income",
				items: rawItems.map((it) => {
					const rec = typeof it === "object" && it !== null ? (it as Record<string, unknown>) : {};
					const priceRub = typeof rec.priceRub === "number" ? rec.priceRub : typeof rec.priceKopecks === "number" ? kopecksToRubles(rec.priceKopecks) : 0;
					const amountRub = typeof rec.amountRub === "number" ? rec.amountRub : typeof rec.amountKopecks === "number" ? kopecksToRubles(rec.amountKopecks) : 0;
					return {
						name: String(rec.name || "Стоматологическая услуга"),
						priceRub,
						quantity: typeof rec.quantity === "number" ? rec.quantity : 1,
						amountRub,
						vatRate: "vat_0" as const,
					};
				}),
				totalRub: typeof input.amountRub === "number"
					? input.amountRub
					: typeof p.totalRub === "number"
						? p.totalRub
						: typeof p.totalKopecks === "number"
							? kopecksToRubles(p.totalKopecks)
							: 0,
				electronicRub: typeof p.electronicRub === "number" ? p.electronicRub : 0,
				cashRub: typeof p.cashRub === "number" ? p.cashRub : 0,
				sbpRub: typeof p.sbpRub === "number" ? p.sbpRub : 0,
				prepaidRub: typeof p.prepaidRub === "number" ? p.prepaidRub : 0,
				visitId: input.visitId || (typeof p.visitId === "string" ? p.visitId : undefined),
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
