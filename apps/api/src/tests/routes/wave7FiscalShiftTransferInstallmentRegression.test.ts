import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
	calculateShiftTenderTotals,
	type CalculatedShiftTotals,
} from "../../routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.js";
import { registerCashTransferRoutes } from "../../routes/cashbox/cashboxShiftModules/cashTransferRoutes.js";
import { registerInstallmentContractsRoutes } from "../../routes/cashbox/installmentModules/installmentContractsRoutes.js";
import {
	FISCAL_QUEUE_STATUSES,
	MAX_FISCAL_RETRIES,
} from "../../routes/fiscal/receiptRoutes/constants.js";
import { fiscalQueueQuerySchema } from "../../routes/fiscal/receiptRoutes/types.js";
import {
	MAX_FISCAL_RETRIES as WORKER_MAX_RETRIES,
	FiscalQueueRetryWorker,
} from "../../services/hardware/queueModules/fiscalQueueWorker.js";

describe("Wave 7 Fiscal, Shifts, Advances & Cash Transfer Regression Suite", () => {
	it("1. Constants & schemas enforce MAX_FISCAL_RETRIES = 10 and dead_letter queue status", () => {
		assert.equal(MAX_FISCAL_RETRIES, 10);
		assert.equal(WORKER_MAX_RETRIES, 10);
		assert.ok(FISCAL_QUEUE_STATUSES.includes("dead_letter"));
		const parsed = fiscalQueueQuerySchema.safeParse({ status: "dead_letter" });
		assert.equal(parsed.success, true);

		const delay0 = FiscalQueueRetryWorker.calculateNextAttemptDelayMs(0, 1000, 60000, false);
		const delay3 = FiscalQueueRetryWorker.calculateNextAttemptDelayMs(3, 1000, 60000, false);
		assert.equal(delay0, 1000);
		assert.equal(delay3, 8000);
	});

	it("2. calculateShiftTenderTotals separates advance deposit vs advance offset, isolates SBP box, and keeps host expenses separate from returns", async () => {
		const shift = {
			openedAt: new Date("2026-11-27T08:00:00Z"),
			cashBoxId: "box-main",
			startBalanceRub: 1000,
			startBalanceKopecks: 100000,
		} as unknown as Parameters<typeof calculateShiftTenderTotals>[2];

		let queryIdx = 0;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => {
						queryIdx++;
						if (queryIdx % 2 === 1) {
							return [
								{
									id: "op-adv-in",
									cashBoxId: "box-main",
									operationType: "income",
									amountRub: 30000,
									amountKopecks: 3000000n,
									reasonText: "Внесение аванса на лечение (наличные)",
									metadata: { isAdvanceDeposit: true, paymentId: "pay-dep-1" },
								},
								{
									id: "op-host-exp",
									cashBoxId: "box-main",
									operationType: "expense",
									amountRub: 2000,
									amountKopecks: 200000n,
									reasonText: "Выдать ДС сотруднику",
									metadata: { catalogAlias: "payment_employee" },
								},
								{
									id: "op-ret-1",
									cashBoxId: "box-main",
									operationType: "expense",
									amountRub: 500,
									amountKopecks: 50000n,
									reasonText: "Возврат по кассовому чеку №12",
									metadata: { refundCashKopecks: 50000 },
								},
								{
									id: "op-other-box",
									cashBoxId: "box-sbp",
									operationType: "income",
									amountRub: 7000,
									amountKopecks: 700000n,
									reasonText: "Оплата СБП",
									metadata: { paymentId: "pay-sbp-1" },
								},
							];
						}
						return [
							{
								id: "pay-dep-1",
								method: "cash",
								amountRub: 30000,
								amountKopecks: 3000000n,
								documentId: null,
								note: "Внесение аванса на лечение (наличные)",
								fiscalReceipt: { calculationMethod: "advance", depositKopecks: 3000000 },
							},
							{
								id: "pay-offset-1",
								method: "other",
								amountRub: 30000,
								amountKopecks: 3000000n,
								documentId: "inv-1",
								note: "Зачет ранее внесенного личного аванса (депозит)",
								fiscalReceipt: { advanceOffsetKopecks: 3000000 },
							},
							{
								id: "pay-sbp-1",
								method: "online",
								amountRub: 7000,
								amountKopecks: 700000n,
								documentId: "inv-2",
								note: "Оплата СБП",
								fiscalReceipt: null,
							},
						];
					},
				}),
			}),
		} as unknown as Parameters<typeof calculateShiftTenderTotals>[0];

		const mainTotals: CalculatedShiftTotals = await calculateShiftTenderTotals(
			mockDb,
			"org-1",
			shift,
			{ id: "box-main", type: "main", isCashless: false, balanceRub: 28500 } as unknown as Parameters<typeof calculateShiftTenderTotals>[3],
		);

		assert.equal(mainTotals.advanceDepositsRub, 30000, "Main box records 30 000 RUB advance deposit");
		assert.equal(mainTotals.incomeCashRub, 0, "Advance deposit must NOT inflate realized cash sales");
		assert.equal(mainTotals.operationalExpenseRub, 2000, "Employee payout stays in operationalExpenseRub");
		assert.equal(mainTotals.returnTotalRub, 500, "Only real customer refund belongs in returnTotalRub");
		assert.equal(mainTotals.expectedCashInDrawerRub, 28500, "Drawer = 1000 start + 30000 adv deposit - 2000 payout - 500 refund");

		const cashlessTotals = await calculateShiftTenderTotals(
			mockDb,
			"org-1",
			{ ...shift, cashBoxId: "box-cashless" } as unknown as Parameters<typeof calculateShiftTenderTotals>[2],
			{ id: "box-cashless", type: "cashless", isCashless: true, balanceRub: 0 } as unknown as Parameters<typeof calculateShiftTenderTotals>[3],
		);
		assert.equal(cashlessTotals.advanceOffsetRub, 30000, "Realized advance offset is counted once (not 60 000)");
		assert.equal(cashlessTotals.incomeSbpRub, 0, "SBP payment attributed to box-sbp must not leak into box-cashless");
		assert.equal(cashlessTotals.netRevenueRub, 30000, "Net revenue is 30 000 RUB, never doubled to 60 000");

		const sbpTotals = await calculateShiftTenderTotals(
			mockDb,
			"org-1",
			{ ...shift, cashBoxId: "box-sbp" } as unknown as Parameters<typeof calculateShiftTenderTotals>[2],
			{ id: "box-sbp", type: "sbp", isCashless: false, balanceRub: 7000 } as unknown as Parameters<typeof calculateShiftTenderTotals>[3],
		);
		assert.equal(sbpTotals.incomeSbpRub, 7000, "Dedicated sbp cashbox must capture SBP revenue");
		assert.equal(sbpTotals.incomeElectronicRub, 0, "Dedicated sbp cashbox must not duplicate card revenue");
	});

	it("3. Registers POST /api/cash/cash-transfer and installment routes without Fastify conflicts", async () => {
		const app = Fastify();
		const registered = new Set<string>();
		app.addHook("onRoute", (r) => {
			registered.add(`${String(r.method)} ${r.url}`);
		});
		registerCashTransferRoutes(app);
		registerInstallmentContractsRoutes(app);
		await app.ready();

		assert.ok(registered.has("POST /api/cash/cash-transfer"));
		assert.ok(registered.has("POST /api/installments"));
		assert.ok(registered.has("GET /api/installments"));
		assert.ok(registered.has("GET /api/installments/:id"));
	});
});
