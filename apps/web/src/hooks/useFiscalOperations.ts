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
		const payload = typeof receipt.payload === "object" && receipt.payload !== null ? receipt.payload : {};
		const totalKop =
			payload.totalKopecks ??
			(payload.totalRub
				? Math.round(Number(payload.totalRub) * 100)
				: undefined);

		const rawItems = Array.isArray(payload.items) ? payload.items : [];
		const normalizedItems = rawItems.length > 0
			? rawItems.map((it: any) => {
					const priceKop =
						it.priceKopecks !== undefined
							? Number(it.priceKopecks)
							: it.priceRub !== undefined
								? Math.round(Number(it.priceRub) * 100)
								: 0;
					const qty = Number(it.quantity || 1);
					const amountKop =
						it.amountKopecks !== undefined
							? Number(it.amountKopecks)
							: priceKop * qty;
					return {
						name: String(it.name || "Стоматологические услуги"),
						priceKopecks: priceKop,
						quantity: qty,
						amountKopecks: amountKop,
						method: it.method || "full_payment",
						subject: it.subject || "service",
						vatRate: it.vatRate || "vat_none",
						measure: it.measure || "piece",
					};
				})
			: [
					{
						name: "Стоматологические услуги",
						priceKopecks: totalKop ?? 0,
						quantity: 1,
						amountKopecks: totalKop ?? 0,
						method: "full_payment",
						subject: "service",
						vatRate: "vat_none",
						measure: "piece",
					},
				];

		const computedTotalKop =
			totalKop !== undefined
				? totalKop
				: normalizedItems.reduce(
						(acc: number, it: any) => acc + (it.amountKopecks || 0),
						0,
					);

		const paymentType = payload.paymentType || "card";
		let cashKopecks = Number(payload.cashKopecks ?? 0);
		let electronicCardKopecks = Number(payload.electronicCardKopecks ?? 0);
		let sbpKopecks = Number(payload.sbpKopecks ?? 0);
		let prepaidKopecks = Number(payload.prepaidKopecks ?? 0);
		const creditKopecks = Number(payload.creditKopecks ?? 0);

		if (
			cashKopecks +
				electronicCardKopecks +
				sbpKopecks +
				prepaidKopecks +
				creditKopecks ===
				0 &&
			computedTotalKop > 0
		) {
			if (paymentType === "cash") {
				cashKopecks = computedTotalKop;
			} else if (paymentType === "sbp") {
				sbpKopecks = computedTotalKop;
			} else if (paymentType === "deposit" || paymentType === "family_wallet") {
				prepaidKopecks = computedTotalKop;
			} else {
				electronicCardKopecks = computedTotalKop;
			}
		}

		const normalizedDto = {
			...payload,
			patientId: receipt.patientId || payload.patientId,
			visitId: receipt.visitId || payload.visitId,
			invoiceId: payload.invoiceId,
			clientMutationId: receipt.idempotencyKey || payload.clientMutationId,
			customerContact:
				payload.customerContact ||
				payload.patientPhoneOrEmail ||
				"+79990000000",
			customerName:
				payload.customerName || payload.patientName || "Пациент клиники",
			cashierFullName:
				payload.cashierName ||
				payload.cashierFullName ||
				"Кассир-администратор",
			items: normalizedItems,
			totalKopecks: computedTotalKop,
			cashKopecks,
			electronicCardKopecks,
			sbpKopecks,
			prepaidKopecks,
			creditKopecks,
		};

		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (receipt.idempotencyKey) {
			headers["Idempotency-Key"] = receipt.idempotencyKey;
		}

		const res = await fetch("/api/billing/fiscalize-receipt", {
			method: "POST",
			headers,
			body: JSON.stringify(normalizedDto),
		});
		if (res.ok) {
			return true;
		}
		const data = (await res.json().catch(() => null)) as {
			error?: string;
			message?: string;
		} | null;
		return { success: false, error: data?.message || data?.error || `HTTP ${res.status}` };
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
