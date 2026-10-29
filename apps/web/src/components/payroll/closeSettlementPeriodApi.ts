/**
 * closeSettlementPeriodApi.ts — Клиентский API-мост фиксации закрытия расчетного периода.
 * Сквозная транзакция в PostgreSQL через Fastify API (Мандат 8e, Мандат 8wy).
 * Mandate 8b: строго <= 120 строк на файл.
 */

export interface CloseSettlementPeriodParams {
	readonly doctorId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly chairRentalRub?: number;
	readonly advanceRub?: number;
	readonly taxRegime?: "employee" | "self_employed";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly netBaseKop: number;
	readonly categoryPercent: number;
	readonly totalAccruedKop: number;
	readonly ndflKop: number;
	readonly netPayoutKop: number;
	readonly markPaid?: boolean;
}

export interface SettlementStatementPayload {
	readonly id: string;
	readonly period: string;
	readonly isFinalized: boolean;
	readonly paidAt?: string | null;
	readonly grossRevenueRub: number;
	readonly netPayoutRub: number;
	readonly createdAt: string;
}

export interface CloseSettlementPeriodResult {
	readonly ok: boolean;
	readonly statementId: string;
	readonly statement: SettlementStatementPayload;
	readonly closedAppointmentsCount: number;
	readonly message: string;
}

export async function closeSettlementPeriodApi(
	params: CloseSettlementPeriodParams,
): Promise<CloseSettlementPeriodResult> {
	const res = await fetch("/api/doctor/close-settlement-period", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	});

	if (!res.ok) {
		const errData = await res.json().catch(() => null);
		throw new Error(errData?.message || `Ошибка закрытия периода: HTTP ${res.status}`);
	}

	return (await res.json()) as CloseSettlementPeriodResult;
}

export async function reopenSettlementPeriodApi(
	doctorId: string,
	periodStart: string,
	periodEnd: string,
): Promise<{ ok: boolean; isFinalized: boolean }> {
	const res = await fetch("/api/doctor/settlement-period/reopen", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ doctorId, periodStart, periodEnd }),
	});

	if (!res.ok) {
		const errData = await res.json().catch(() => null);
		throw new Error(errData?.message || `Ошибка открытия периода: HTTP ${res.status}`);
	}

	return (await res.json()) as { ok: boolean; isFinalized: boolean };
}
