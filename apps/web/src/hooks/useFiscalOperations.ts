/**
 * useFiscalOperations.ts
 *
 * DENTE Dental CRM — 54-FZ Fiscal Operations & Offline Resilience Hook.
 * Mandate 8e: Frictionless Cashier Autonomy & Non-blocking Payment Intake.
 *
 * Automatically intercepts network failures and offline states, queuing receipts into
 * `offlineFiscalQueue` without interrupting the checkout or intake flow.
 */

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../components/GlobalToast";
import {
	type OfflineFiscalReceipt,
	enqueueOfflineReceipt,
	getPendingOfflineReceipts,
	registerDefaultSyncHandler,
	subscribeOfflineFiscalQueue,
	syncPendingReceipts,
	triggerAutoSync,
} from "../services/billing/offlineFiscalQueue";

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

async function sendReceiptToServer(receipt: OfflineFiscalReceipt): Promise<boolean | { success: boolean; error?: string }> {
	try {
		const res = await fetch("/api/billing/fiscalize-receipt", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				paymentId: receipt.paymentId,
				visitId: receipt.visitId,
				payload: receipt.payload,
				idempotencyKey: receipt.idempotencyKey,
			}),
		});
		if (res.ok) {
			return true;
		}
		const data = (await res.json().catch(() => null)) as { error?: string } | null;
		return { success: false, error: data?.error || `HTTP ${res.status}` };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Network failure",
		};
	}
}

export function useFiscalOperations() {
	const [isOnline, setIsOnline] = useState<boolean>(() => {
		return typeof navigator !== "undefined" ? navigator.onLine : true;
	});

	const [pendingReceipts, setPendingReceipts] = useState<OfflineFiscalReceipt[]>([]);
	const [isSyncing, setIsSyncing] = useState<boolean>(false);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			void triggerAutoSync();
		};
		const handleOffline = () => setIsOnline(false);

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);
		}

		registerDefaultSyncHandler(sendReceiptToServer);

		const unsubscribe = subscribeOfflineFiscalQueue((all) => {
			setPendingReceipts(all.filter((r) => r.status === "pending_fiscal_sync"));
		});

		void getPendingOfflineReceipts().then(setPendingReceipts);

		// Background retry poller every 30s when online
		const retryInterval = setInterval(() => {
			if (typeof navigator !== "undefined" && navigator.onLine) {
				void triggerAutoSync();
			}
		}, 30000);

		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			}
			clearInterval(retryInterval);
			unsubscribe();
		};
	}, []);

	const queueOfflineReceipt = useCallback(
		async (input: FiscalOperationInput, reason?: string): Promise<OfflineFiscalReceipt> => {
			const item = await enqueueOfflineReceipt({
				visitId: input.visitId,
				paymentId: input.paymentId,
				payload: input.payload,
				lastError: reason || (!isOnline ? "Отсутствует сетевое подключение" : "Сбой сетевого запроса к ОФД"),
				idempotencyKey: input.clientMutationId,
			});

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
			// If already known to be offline, bypass immediate network call to prevent UI lag
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
				console.warn(
					"[useFiscalOperations] Online fiscalization failed, buffering offline:",
					errorMsg,
				);

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

	const syncQueue = useCallback(async (
		// biome-ignore lint/suspicious/noExplicitAny: generic handler
		syncHandler: (receipt: OfflineFiscalReceipt) => Promise<any>,
	) => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			const result = await syncPendingReceipts(syncHandler);
			if (result.syncedCount > 0) {
				showToast(
					`Синхронизировано чеков из очереди: ${result.syncedCount}`,
					"success",
					4000,
				);
			}
			return result;
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
