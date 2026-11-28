/**
 * settlementPeriodCloseIntegration.test.ts — Runtime SUT Verification of Settlement Period Closing & Reopening
 * Mandate 8e: Doctor Autonomy. Mandate 8wy: Zero Mocks / Real API & UI Contract Invocation.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { closeSettlementPeriodApi, reopenSettlementPeriodApi } from "../../closeSettlementPeriodApi";
import { fetchDoctorEarningsWithStatusApi } from "../../fetchDoctorEarningsApi";
import { DoctorPayrollStudioModal } from "../../DoctorPayrollStudioModal";
import {
	CANONICAL_DEMO_ORDERS,
	CANONICAL_PAYROLL_DOCTORS,
} from "../../payrollCatalogData";

const originalFetch = globalThis.fetch;

describe("Settlement Period Close & Reopen Runtime SUT Verification", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("1. closeSettlementPeriodApi posts real payload with Idempotency-Key UUIDv7 and rejects HTTP errors loudly", async () => {
		const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];

		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const headers = (init?.headers ?? {}) as Record<string, string>;
			calls.push({
				url: String(input),
				method: init?.method ?? "GET",
				headers,
				body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
			});
			return new Response(
				JSON.stringify({
					ok: true,
					statementId: "stmt-1",
					statement: {
						id: "stmt-1",
						period: "2026-10",
						isFinalized: true,
						grossRevenueRub: 80000,
						netPayoutRub: 15321,
						createdAt: "2026-10-31T18:00:00.000Z",
					},
					closedAppointmentsCount: 2,
					message: "Закрыто",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		const res = await closeSettlementPeriodApi({
			doctorId: "doc-volkov",
			periodStart: "2026-10-01",
			periodEnd: "2026-10-31",
			payoutModel: "percentage",
			grossRevenueKop: 8000000,
			labCostKop: 1800000,
			materialCostKop: 330000,
			netBaseKop: 5870000,
			categoryPercent: 30,
			totalAccruedKop: 1761000,
			ndflKop: 228930,
			netPayoutKop: 1532070,
			markPaid: true,
		});

		assert.equal(res.ok, true);
		assert.equal(res.statementId, "stmt-1");
		assert.equal(calls.length, 1);
		assert.equal(calls[0]?.url, "/api/doctor/close-settlement-period");
		assert.equal(calls[0]?.method, "POST");
		assert.match(calls[0]?.headers["Idempotency-Key"] ?? "", /^[0-9a-f-]{36}$/i);
		assert.equal(calls[0]?.headers["Idempotency-Key"], calls[0]?.headers["X-Idempotency-Key"]);
		assert.equal(calls[0]?.body.doctorId, "doc-volkov");
		assert.equal(calls[0]?.body.netPayoutKop, 1532070);

		// Error path must throw explicitly instead of faking success
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Период уже закрыт" }), {
				status: 409,
				headers: { "Content-Type": "application/json" },
			})) as typeof fetch;

		await assert.rejects(
			() =>
				closeSettlementPeriodApi({
					doctorId: "doc-volkov",
					periodStart: "2026-10-01",
					periodEnd: "2026-10-31",
					payoutModel: "percentage",
					grossRevenueKop: 8000000,
					labCostKop: 0,
					materialCostKop: 0,
					netBaseKop: 8000000,
					categoryPercent: 30,
					totalAccruedKop: 2400000,
					ndflKop: 312000,
					netPayoutKop: 2088000,
				}),
			/Период уже закрыт/,
		);
	});

	it("2. reopenSettlementPeriodApi & fetchDoctorEarningsWithStatusApi execute real API round-trips", async () => {
		const urls: string[] = [];
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const url = String(input);
			urls.push(url);
			if (url.startsWith("/api/v1/payroll/calculations")) {
				return new Response(
					JSON.stringify({
						orders: [
							{
								id: "ord-99",
								dateIso: "2026-10-15",
								patientName: "Тестов Пациент",
								medicalCardNumber: "001",
								serviceNameRu: "Коронка",
								category: "orthopedics",
								grossKopecks: 2500000,
								labCostKopecks: 500000,
								materialCostKopecks: 100000,
								doctorId: "doc-1",
								isPaid54Fz: true,
							},
						],
						closedPeriods: [{ id: "cls-1" }],
						summary: {
							id: "stmt-1",
							period: "2026-10",
							isFinalized: true,
							grossRevenueRub: 25000,
							netPayoutRub: 4959,
							createdAt: "2026-10-31T18:00:00.000Z",
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ ok: true, isFinalized: false }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;

		const fetched = await fetchDoctorEarningsWithStatusApi({
			doctorId: "doc-1",
			periodStart: "2026-10-01",
			periodEnd: "2026-10-31",
			payoutModel: "percentage",
			chairRentalRub: 0,
			advanceRub: 0,
			taxRegime: "employee",
			commissionPercent: 30,
		});

		assert.equal(fetched.services.length, 1);
		assert.equal(fetched.services[0]?.grossRevenueKop, 2500000);
		assert.equal(fetched.isPeriodClosed, true);
		assert.ok(urls[0]?.includes("/api/v1/payroll/calculations"));
		assert.ok(urls[0]?.includes("commissionPercent=30"));

		const reopened = await reopenSettlementPeriodApi("doc-1", "2026-10-01", "2026-10-31");
		assert.equal(reopened.ok, true);
		assert.equal(reopened.isFinalized, false);
		assert.equal(urls[1], "/api/doctor/settlement-period/reopen");
	});

	it("3. DoctorPayrollStudioModal renders live primary settlement CTA without Potemkin simulation banner", () => {
		const html = renderToString(
			React.createElement(DoctorPayrollStudioModal, {
				isOpen: true,
				onClose: () => {},
				clinicName: "Тест Клиника",
				initialDoctorId: CANONICAL_PAYROLL_DOCTORS[0]?.id,
				orders: [...CANONICAL_DEMO_ORDERS],
			}),
		);
		assert.ok(html.includes('data-testid="payroll-studio-primary-cta"'));
		assert.ok(!html.includes("setPeriodClosedNotice"));
	});
});
