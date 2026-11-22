import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateShiftTenderTotals,
	generateShiftFiscalMetadata,
} from "../routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.js";
import { invoicePayHandler } from "../routes/billingRoutes/handlers/invoicePayWrapper.js";

describe("Red Team Fixer Surgeon 1: Cashbox 54-FZ & Billing Defect Verification", () => {
	it("SEV-1.1: generates honest nulls without fabricating FN/FD/FPD when KKT is offline", () => {
		const meta = generateShiftFiscalMetadata({
			orgId: "org-real-clinic-2026",
			shiftNumber: 15,
			totalRevenueRub: 50000,
			closedAt: new Date("2026-11-20T19:00:00Z"),
			isKktConnected: false,
		});

		assert.equal(meta.fiscalDocNumber, null, "FD must be null when KKT is offline");
		assert.equal(meta.fiscalSign, null, "FPD must be null when KKT is offline");
		assert.equal(meta.qrString, null, "QR string must be null when KKT is offline");
		assert.equal(meta.isOfflineKkt, true);
		assert.ok(meta.statusDescription.includes("оффлайн") || meta.statusDescription.includes("Локальный"));
	});

	it("SEV-1.2: eliminates double accounting between main cash and cashless boxes", async () => {
		const shift = {
			openedAt: new Date(Date.now() - 3600000),
			cashBoxId: "box-1",
			startBalanceRub: 0,
		} as any;
		let queryCount = 0;
		const dummyDb = {
			select: () => ({
				from: () => ({
					where: () => {
						queryCount++;
						if (queryCount % 2 === 1) {
							// 1st query is cashOperations
							return [];
						}
						// 2nd query is payments
						return [
							{ method: "cash", amountRub: 1000 },
							{ method: "card", amountRub: 2500 },
							{ method: "sbp", amountRub: 1500 },
							{ method: "family_wallet", amountRub: 500 },
						];
					},
				}),
			}),
		} as any;

		// 1. Касса наличных ('main') должна посчитать ТОЛЬКО наличные 1000 руб
		const mainTotals = await calculateShiftTenderTotals(
			dummyDb,
			"org-1",
			shift,
			{ id: "box-1", type: "main", isCashless: false } as any,
		);

		assert.equal(mainTotals.incomeCashRub, 1000, "Main box must account strictly for cash");
		assert.equal(mainTotals.incomeElectronicRub, 0, "Main box must not count cashless tenders");
		assert.equal(mainTotals.incomeSbpRub, 0, "Main box must not count SBP tenders");
		assert.equal(mainTotals.advanceOffsetRub, 0, "Main box must not count advance offsets");
		assert.equal(mainTotals.netRevenueRub, 1000, "Main box revenue must be strictly cash 1000");

		// 2. Безналичная касса ('cashless') должна посчитать ТОЛЬКО безналичные платежи
		const cashlessTotals = await calculateShiftTenderTotals(
			dummyDb,
			"org-1",
			shift,
			{ id: "box-2", type: "cashless", isCashless: true } as any,
		);

		assert.equal(cashlessTotals.incomeCashRub, 0, "Cashless box must not count cash");
		assert.equal(cashlessTotals.incomeElectronicRub, 2500, "Cashless box accounts for card");
		assert.equal(cashlessTotals.incomeSbpRub, 1500, "Cashless box accounts for SBP");
		assert.equal(cashlessTotals.advanceOffsetRub, 500, "Cashless box accounts for advance");
		assert.equal(cashlessTotals.netRevenueRub, 4500, "Cashless box revenue must be 4500");
	});

	it("SEV-2.1: invoicePayHandler rejects payment without Idempotency-Key with HTTP 400", async () => {
		const validUuid = "11111111-2222-3333-4444-555555555555";
		let sentCode: number | null = null;
		let sentPayload: any = null;

		const mockRequest: any = {
			params: { id: validUuid },
			body: {},
			headers: {},
		};

		const mockReply: any = {
			code(c: number) {
				sentCode = c;
				return this;
			},
			send(p: any) {
				sentPayload = p;
				return this;
			},
		};

		await invoicePayHandler(mockRequest, mockReply);

		assert.equal(sentCode, 400, "Must return HTTP 400 Bad Request");
		assert.equal(sentPayload?.error, "IdempotencyKeyRequired");
		assert.ok(
			sentPayload?.message?.includes("обязателен уникальный ключ идемпотентности"),
			"Must inform caller about mandatory idempotency key",
		);
	});

	it("SEV-2.2: cashbox refund endpoint rejects request without Idempotency-Key with HTTP 400", async () => {
		const Fastify = (await import("fastify")).default;
		const app = Fastify();
		app.addHook("preHandler", async (req: any) => {
			req.__denteIdentity = {
				organizationId: "00000000-0000-0000-0000-000000000001",
				userId: "00000000-0000-0000-0000-000000000002",
				role: "admin",
				isVerified: true,
			};
		});

		const { registerCashboxRefundRoutes } = await import(
			"../routes/cashbox/cashboxRefundRoutes.js"
		);
		await registerCashboxRefundRoutes(app);

		const res = await app.inject({
			method: "POST",
			url: "/api/cash/refund",
			payload: {
				amountRub: 500,
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "IdempotencyKeyRequired");
		assert.ok(
			json.message?.includes("обязателен заголовок Idempotency-Key"),
			"Must inform caller that idempotency key is required",
		);
	});

	it("SEV-1.4: processCashboxPayment requires Idempotency-Key or clientMutationId", async () => {
		const { processCashboxPayment } = await import(
			"../routes/cashbox/cashboxPaymentProcessor.js"
		);
		const outcome = await processCashboxPayment("00000000-0000-0000-0000-000000000001", {
			amountRub: 1000,
			method: "cash",
		});
		assert.equal(outcome.statusCode, 400);
		assert.equal(outcome.body.error, "IdempotencyKeyRequired");
	});
});
