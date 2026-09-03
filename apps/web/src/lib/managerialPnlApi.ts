/**
 * managerialPnlApi.ts — API Client for Dental Managerial P&L Report.
 */

import type { ManagerialPnlReport } from "@dental/shared";

export interface FetchPnlParams {
	from?: string | undefined; // YYYY-MM-DD
	to?: string | undefined;   // YYYY-MM-DD
}

export async function fetchManagerialPnl(
	headers: Record<string, string>,
	params: FetchPnlParams = {},
): Promise<{ data: ManagerialPnlReport }> {
	const query = new URLSearchParams();
	if (params.from) query.set("from", params.from);
	if (params.to) query.set("to", params.to);

	const url = `/api/reports/pnl${query.toString() ? `?${query.toString()}` : ""}`;
	const res = await fetch(url, { method: "GET", headers });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: "Ошибка загрузки P&L отчета" }));
		throw new Error(err.message || `Ошибка HTTP ${res.status}`);
	}
	return res.json();
}
