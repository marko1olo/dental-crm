/**
 * closeSettlementPeriodApi.ts — Клиентский API-мост фиксации закрытия расчетного периода.
 * Сквозная транзакция в PostgreSQL через Fastify API (Мандат 8e, Мандат 8wy).
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { generateUuidV7 } from "@dental/shared";
import {
	isPlainRecord,
	parseJsonEnvelope,
	readApiErrorMessage,
} from "../../lib/apiResponseHandler";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";

export interface CloseSettlementPeriodParams {
	readonly doctorId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly chairRentalRub?: number;
	readonly chairRentalKopecks?: number;
	readonly advanceKopecks?: number;
	readonly advanceRub?: number;
	readonly taxRegime?: "employee" | "self_employed";
	readonly identSalaryModel?: "gross_before_discount" | "net_proportional_discount" | "net_doctor_bears_discount";
	readonly cashAdvancePolicy?: "clinic_first" | "doctor_first" | "proportional";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly netBaseKop: number;
	readonly categoryPercent: number;
	readonly totalAccruedKop: number;
	readonly ndflKop: number;
	readonly netPayoutKop: number;
	readonly markPaid?: boolean;
	readonly doctorReconciled?: boolean;
	readonly idempotencyKey?: string;
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

function isSettlementStatementPayload(
	value: unknown,
): value is SettlementStatementPayload {
	return (
		isPlainRecord(value) &&
		typeof value.id === "string" &&
		typeof value.period === "string" &&
		typeof value.isFinalized === "boolean"
	);
}

function isCloseSettlementPeriodResult(
	value: unknown,
): value is CloseSettlementPeriodResult {
	return (
		isPlainRecord(value) &&
		typeof value.ok === "boolean" &&
		typeof value.statementId === "string" &&
		typeof value.closedAppointmentsCount === "number" &&
		(value.statement === null || isSettlementStatementPayload(value.statement))
	);
}

function isReopenSettlementPeriodResult(
	value: unknown,
): value is { ok: boolean; isFinalized: boolean } {
	return (
		isPlainRecord(value) &&
		typeof value.ok === "boolean" &&
		typeof value.isFinalized === "boolean"
	);
}

export async function closeSettlementPeriodApi(
	params: CloseSettlementPeriodParams,
): Promise<CloseSettlementPeriodResult> {
	const idempotencyKey = params.idempotencyKey || generateUuidV7();

	const res = await fetch("/api/doctor/close-settlement-period", {
		method: "POST",
		headers: {
			...getDenteAuthHeaders(),
			"Content-Type": "application/json",
			"Idempotency-Key": idempotencyKey,
			"X-Idempotency-Key": idempotencyKey,
		},
		body: JSON.stringify({
			...params,
			idempotencyKey,
		}),
	});

	if (!res.ok) {
		throw new Error(await readApiErrorMessage(res, "Ошибка закрытия периода"));
	}

	return parseJsonEnvelope(
		res,
		isCloseSettlementPeriodResult,
		"Ошибка закрытия периода",
	);
}

export async function reopenSettlementPeriodApi(
	doctorId: string,
	periodStart: string,
	periodEnd: string,
	optionalIdempotencyKey?: string,
): Promise<{ ok: boolean; isFinalized: boolean }> {
	const idempotencyKey = optionalIdempotencyKey || generateUuidV7();
	const res = await fetch("/api/doctor/settlement-period/reopen", {
		method: "POST",
		headers: {
			...getDenteAuthHeaders(),
			"Content-Type": "application/json",
			"Idempotency-Key": idempotencyKey,
			"X-Idempotency-Key": idempotencyKey,
		},
		body: JSON.stringify({ doctorId, periodStart, periodEnd }),
	});

	if (!res.ok) {
		throw new Error(await readApiErrorMessage(res, "Ошибка открытия периода"));
	}

	return parseJsonEnvelope(
		res,
		isReopenSettlementPeriodResult,
		"Ошибка открытия периода",
	);
}
