/**
 * cashShiftService.ts — Реальная транзакция закрытия и открытия смены в БД (54-ФЗ).
 * Ликвидация потемкинских деревень: реальные вызовы /api/fiscal/shift/close
 * и /api/fiscal/shift/open с фиксацией в таблицах cash_shifts и cash_box_shifts.
 */

import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService.js";
import { safeLocalStorageGetItem } from "../../../lib/safeLocalStorage.js";

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

function getAuthHeaders(): Record<string, string> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const token = safeLocalStorageGetItem("dente_token") || safeLocalStorageGetItem("token");
	if (token) headers.Authorization = `Bearer ${token}`;
	const orgId = safeLocalStorageGetItem("dente_organization_id") || safeLocalStorageGetItem("organization_id");
	if (orgId) headers["x-organization-id"] = orgId;
	return headers;
}

export async function executeCloseShiftDbTransaction(payload: CloseShiftPayload): Promise<boolean> {
	const endpoints = [
		"/api/fiscal/shift/close",
		"/api/cash/cash-box-all-closing",
		"/api/finance/shift/close",
	];

	const body = JSON.stringify({
		shiftNumber: payload.shiftNumber,
		cashierFullName: payload.cashierName || "Дежурный администратор",
		cashierInn: payload.cashierInn || undefined,
		actualCashInDrawerRub: payload.countedCashRub ?? payload.cashInDrawerRub ?? 0,
		countedCashRub: payload.countedCashRub ?? payload.cashInDrawerRub ?? 0,
		expectedCashInDrawerRub: payload.cashInDrawerRub ?? 0,
		force: true,
		closedAt: new Date().toISOString(),
	});

	let succeeded = false;
	for (const url of endpoints) {
		try {
			const res = await fetch(url, { method: "POST", headers: getAuthHeaders(), body });
			if (res.ok) {
				succeeded = true;
				break;
			}
		} catch {
			// fallback к следующему эндпоинту
		}
	}

	StaffActionAuditService.logShiftClose({
		cashRegisterId: "kkt_main",
		shiftNumber: payload.shiftNumber,
		totalRevenueKopecks: Math.round((payload.netRevenueRub || 0) * 100),
		closingCashKopecks: Math.round((payload.cashInDrawerRub || 0) * 100),
	});

	return succeeded;
}

export async function executeOpenShiftDbTransaction(payload: OpenShiftPayload): Promise<boolean> {
	const endpoints = ["/api/fiscal/shift/open", "/api/cash/cash-box-all-open", "/api/finance/shift/open"];
	const body = JSON.stringify({
		cashierFullName: payload.cashierName || "Дежурный администратор",
		startingBalanceRub: payload.startingBalanceRub || 0,
		openedAt: new Date().toISOString(),
	});

	for (const url of endpoints) {
		try {
			const res = await fetch(url, { method: "POST", headers: getAuthHeaders(), body });
			if (res.ok) return true;
		} catch {
			// fallback к следующему эндпоинту
		}
	}
	return false;
}
