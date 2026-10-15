/**
 * apps/web/src/components/finance/modal/payment/executionModules/paymentApiDispatcher.ts
 *
 * Clean payment dispatch to backend `/api/finance/payments` with fallback to `/api/billing/payments`
 * and offline queue buffering via `enqueueOfflineReceipt` per 54-FZ & Mandate 8e.
 */

import type { ReceiptItem } from "../../../../billing/ReceiptPreview.js";
import { enqueueOfflineReceipt } from "../../../../../services/billing/offlineFiscalQueue.js";
import type { PaymentApiInvoiceItem, PaymentApiRequestBody } from "./paymentExecutionTypes.js";

export interface DispatchPaymentResult {
	readonly success: boolean;
	readonly data?: Record<string, unknown> | undefined;
	readonly error?: string | undefined;
	readonly isOfflineBuffered?: boolean | undefined;
}

export function formatInvoiceItems(
	items?: readonly ReceiptItem[] | undefined,
): readonly PaymentApiInvoiceItem[] | undefined {
	if (!items || items.length === 0) return undefined;
	return items.map((it) => ({
		name: it.name,
		code804n: it.code804n,
		quantity: it.quantity,
		priceRub: it.priceRub,
		amountRub: it.amountRub,
		toothNumber: it.toothNumber,
	}));
}

/**
 * Dispatches payment mutation to the backend with offline queue fallback.
 */
export async function dispatchPaymentApi(
	payload: PaymentApiRequestBody,
	headers: Record<string, string>,
): Promise<DispatchPaymentResult> {
	const endpoints = ["/api/finance/payments", "/api/billing/payments"];
	let lastErrorMsg = "Сбой соединения с сервером кассы";

	// 1. If navigator is explicitly offline, buffer directly to offline queue
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		try {
			await enqueueOfflineReceipt({
				paymentId: `pay-offline-${Date.now()}`,
				visitId: payload.visitId || undefined,
				payload,
				status: "pending_fiscal_sync",
			});
			return {
				success: true,
				isOfflineBuffered: true,
				data: {
					status: "hardware_offline",
					offlineBuffered: true,
					clientMutationId: payload.clientMutationId,
				},
			};
		} catch (queueErr) {
			console.warn("[paymentApiDispatcher] Failed to buffer offline payment:", queueErr);
		}
	}

	// 2. Try primary /api/finance/payments, fallback to /api/billing/payments
	for (const endpoint of endpoints) {
		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
				return {
					success: true,
					data: paymentData,
				};
			}

			// If endpoint returns 404 (route not mounted), try fallback endpoint
			if (res.status === 404 && endpoint !== endpoints[endpoints.length - 1]) {
				continue;
			}

			const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
			const errorMsg =
				(errorData && typeof errorData.message === "string" && errorData.message) ||
				(errorData && typeof errorData.error === "string" && errorData.error) ||
				`Ошибка записи платежа: HTTP ${res.status}`;
			return {
				success: false,
				error: errorMsg,
			};
		} catch (networkErr: unknown) {
			lastErrorMsg =
				networkErr instanceof Error ? networkErr.message : "Сетевая ошибка при передаче платежа";
		}
	}

	// 3. If network failed across both endpoints, buffer into offline queue to preserve cashier flow
	try {
		await enqueueOfflineReceipt({
			paymentId: `pay-offline-${Date.now()}`,
			visitId: payload.visitId || undefined,
			payload,
			status: "pending_fiscal_sync",
		});
		return {
			success: true,
			isOfflineBuffered: true,
			data: {
				status: "hardware_offline",
				offlineBuffered: true,
				clientMutationId: payload.clientMutationId,
			},
		};
	} catch {
		return {
			success: false,
			error: lastErrorMsg,
		};
	}
}
