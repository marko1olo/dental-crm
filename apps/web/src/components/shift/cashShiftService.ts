/**
 * apps/web/src/components/shift/cashShiftService.ts
 *
 * Canonical SSOT for Cash Shift Database Transactions (54-FZ).
 * Calls KKT / cashbox endpoints with persistence and staff audit logging.
 */

import { generateUuidV7, rublesToKopecks } from "@dental/shared";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService.js";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";

export interface CloseShiftPayload {
	readonly shiftNumber: number;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly countedCashRub?: number | undefined;
	readonly netRevenueRub?: number | undefined;
	readonly clinicInn?: string | undefined;
}

export interface OpenShiftPayload {
	readonly cashierName?: string | undefined;
	readonly startingBalanceRub?: number | undefined;
}

function buildShiftMutationHeaders(): Record<string, string> {
	return denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});
}

export async function executeCloseShiftDbTransaction(payload: CloseShiftPayload): Promise<boolean> {
	const canonicalEndpoint = "/api/cashbox/shift/close";

	const body = JSON.stringify({
		shiftNumber: payload.shiftNumber,
		cashierFullName: payload.cashierName || "Дежурный администратор",
		countedCashRub: payload.countedCashRub ?? payload.cashInDrawerRub ?? 0,
		netRevenueRub: payload.netRevenueRub ?? 0,
		force: true,
		closedAt: new Date().toISOString(),
	});

	let succeeded = false;
	let errorReason = "";
	try {
		const res = await fetch(canonicalEndpoint, { method: "POST", headers: buildShiftMutationHeaders(), body });
		if (res.ok) {
			succeeded = true;
		} else {
			const errJson = await res.json().catch(() => null);
			errorReason = errJson?.message || `Ошибка сервера (${res.status})`;
		}
	} catch (endpointErr: unknown) {
		console.warn(`[executeCloseShiftDbTransaction] Сбой при вызове ${canonicalEndpoint}:`, endpointErr);
		errorReason = endpointErr instanceof Error ? endpointErr.message : "Сетевой сбой при закрытии смены";
	}

	if (!succeeded) {
		StaffActionAuditService.logAction({
			actionType: "shift_close",
			entityType: "cash_register_shift",
			entityId: `shift:kkt_main:${payload.shiftNumber}`,
			reason: `Ошибка закрытия смены: ${errorReason}`,
			details: {
				status: "failure",
				error: errorReason,
				shiftNumber: payload.shiftNumber,
			},
		});
		throw new Error(errorReason || "Не удалось закрыть кассовую смену");
	}

	StaffActionAuditService.logShiftClose({
		cashRegisterId: "kkt_main",
		shiftNumber: payload.shiftNumber,
		totalRevenueKopecks: rublesToKopecks(payload.netRevenueRub || 0),
		closingCashKopecks: rublesToKopecks(payload.cashInDrawerRub || 0),
	});

	return succeeded;
}

export async function executeOpenShiftDbTransaction(payload: OpenShiftPayload): Promise<boolean> {
	const canonicalEndpoint = "/api/cashbox/shift/open";
	const body = JSON.stringify({
		cashierFullName: payload.cashierName || "Дежурный администратор",
		openedAt: new Date().toISOString(),
	});

	try {
		const res = await fetch(canonicalEndpoint, { method: "POST", headers: buildShiftMutationHeaders(), body });
		if (res.ok) return true;
	} catch (endpointErr: unknown) {
		console.warn(`[executeOpenShiftDbTransaction] Сбой при вызове ${canonicalEndpoint}:`, endpointErr);
	}
	return false;
}
