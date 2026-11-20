import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createVisitInvoiceInApi } from "../completionModules/visitInvoiceCreationService";

describe("RED TEAM AUDIT: Visit Invoice Creation Pipeline & PostgreSQL 18 Continuity", () => {
	it("1. createVisitInvoiceInApi calls POST /api/invoices and returns real invoice from PostgreSQL", async () => {
		const originalFetch = globalThis.fetch;
		let calledUrl = "";
		let sentBody: any = null;

		globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
			calledUrl = String(url);
			sentBody = init?.body ? JSON.parse(String(init.body)) : null;
			return {
				ok: true,
				status: 201,
				json: async () => ({
					success: true,
					invoice: {
						id: "dce70000-0000-4000-8000-000000000099",
						invoiceNumber: "СЧ-2026-AB12CD",
						number: "СЧ-2026-AB12CD",
						totalAmountRub: 5500,
						status: "issued",
					},
				}),
			} as any;
		}) as any;

		try {
			const result = await createVisitInvoiceInApi({
				effectiveVisitId: "dce70000-0000-4000-8000-000000000001",
				effectivePatientId: "dce70000-0000-4000-8000-000000000002",
				effectiveDoctorId: "dce70000-0000-4000-8000-000000000003",
				result: {
					visitId: "dce70000-0000-4000-8000-000000000001",
					invoiceId: "INV-FALLBACK-123",
					receiptNumber: "ЧЕК-FALLBACK-123",
					patientId: "dce70000-0000-4000-8000-000000000002",
					patientName: "Смирнов Алексей",
					doctorName: "Доктор Иванов",
					totalGrossRub: 5500,
					totalDiscountRub: 0,
					totalNetRub: 5500,
					totalNetKop: 550000,
					items: [
						{
							code: "A16.07.002",
							name: "Лечение кариеса",
							priceRub: 5500,
							quantity: 1,
							discountRub: 0,
							totalRub: 5500,
							category: "therapy",
							toothNumber: 16,
						},
					],
					status: "ready_for_payment",
					statusBannerText: "Приём завершён",
					sbpQrUrl: "",
					sbpQrPayload: "",
					form043uSaved: true,
					completedAtIso: new Date().toISOString(),
				},
			});

			assert.strictEqual(calledUrl, "/api/invoices");
			assert.strictEqual(sentBody.visitId, "dce70000-0000-4000-8000-000000000001");
			assert.strictEqual(sentBody.patientId, "dce70000-0000-4000-8000-000000000002");
			assert.strictEqual(sentBody.totalAmountRub, 5500);
			assert.strictEqual(sentBody.status, "issued");
			assert.strictEqual(sentBody.items.length, 1);
			assert.strictEqual(sentBody.items[0].toothNumber, 16);

			assert.strictEqual(result.isPersistedInDb, true);
			assert.strictEqual(result.invoiceId, "dce70000-0000-4000-8000-000000000099");
			assert.strictEqual(result.invoiceNumber, "СЧ-2026-AB12CD");
			assert.strictEqual(result.totalAmountRub, 5500);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("2. createVisitInvoiceInApi throws structured error on network failures without leaking fake IDs", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async () => {
			throw new Error("Network offline");
		}) as any;

		try {
			await assert.rejects(
				async () => {
					await createVisitInvoiceInApi({
						effectiveVisitId: "dce70000-0000-4000-8000-000000000001",
						effectivePatientId: "dce70000-0000-4000-8000-000000000002",
						result: {
							visitId: "dce70000-0000-4000-8000-000000000001",
							invoiceId: "",
							receiptNumber: "",
							patientId: "dce70000-0000-4000-8000-000000000002",
							patientName: "Смирнов Алексей",
							doctorName: "Доктор Иванов",
							totalGrossRub: 3000,
							totalDiscountRub: 0,
							totalNetRub: 3000,
							totalNetKop: 300000,
							items: [],
							status: "ready_for_payment",
							statusBannerText: "Приём завершён",
							sbpQrUrl: "",
							sbpQrPayload: "",
							form043uSaved: true,
							completedAtIso: new Date().toISOString(),
						},
					});
				},
				/Network offline|Не удалось сохранить счёт в базе данных/,
				"Must reject when network fails instead of synthesizing fake invoice",
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
