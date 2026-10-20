/**
 * apps/api/src/tests/routes/fefoAndMultiTenderInquisitor.test.ts
 *
 * RED TEAM INQUISITOR 3: WAREHOUSE FEFO & MULTI-TENDER CASH INQUISITION TEST SUITE.
 *
 * Rigorous adversarial verification of:
 * 1. Strict FEFO batch sorting with secondary timestamp tie-breaker.
 * 2. Database FEFO deduction across multiple batches with status depletion.
 * 3. Negative stock protection (409 Conflict without overdraft authorization vs 200 OK with explicit overdraft).
 * 4. Concurrent race conditions serialization with SELECT ... FOR UPDATE.
 * 5. Multi-tender POS split exactness (Kopecks) and mismatch rejection.
 * 6. Cash shift closure guard against active in-treatment visits (409 UnfinishedVisitsInChair vs force: true).
 * 7. Doctor piecework calculation strictly on collected cash (Cash Basis) with Art. 137/192 LC RF compliance.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	stockBatches,
	users,
} from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import { warehouseRoutes } from "../../routes/warehouse.js";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
import { sortBatchesByFefo } from "../../services/inventory/fefo/batchSelector.js";
import { validateAndResolvePaymentSplit } from "../../db/billing/paymentSplitValidation.js";
import {
	calculateDoctorNetSalary,
	calculateIdentDoctorSalary,
} from "@dental/shared";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
	const app = createTenantTestApp();
	await registerCashboxRoutes(app);
	await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId: string, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
		"x-organization-id": organizationId,
		"content-type": "application/json",
	};
}

describe("RED TEAM INQUISITOR 3: WAREHOUSE FEFO & MULTI-TENDER CASH INQUISITION", () => {
	const FIXTURE = "redteam3Inquisition";
	const orgId = fixtureUuid(FIXTURE, 1);
	const userId = fixtureUuid(FIXTURE, 2);
	const patientId = fixtureUuid(FIXTURE, 3);
	const doctorUserId = fixtureUuid(FIXTURE, 4);

	it("1. [FEFO Sorter & Tie-Breaker] orders earliest expiration first, tie-breaks on receivedAt/createdAt, and nulls last", () => {
		const batches = [
			{
				id: "b-far",
				batchNumber: "LOT-FAR",
				expirationDate: "2027-12-31",
				createdAt: "2026-01-01T00:00:00Z",
			},
			{
				id: "b-tie-later",
				batchNumber: "LOT-TIE-2",
				expirationDate: "2026-06-01",
				receivedAt: "2026-03-01T00:00:00Z",
				createdAt: "2026-03-01T00:00:00Z",
			},
			{
				id: "b-tie-earlier",
				batchNumber: "LOT-TIE-1",
				expirationDate: "2026-06-01",
				receivedAt: "2026-01-15T00:00:00Z",
				createdAt: "2026-01-15T00:00:00Z",
			},
			{
				id: "b-no-exp",
				batchNumber: "LOT-NO-EXP",
				expirationDate: null,
				createdAt: "2025-01-01T00:00:00Z",
			},
			{
				id: "b-earliest",
				batchNumber: "LOT-EARLY",
				expirationDate: "2026-04-10",
				createdAt: "2026-02-01T00:00:00Z",
			},
		];

		const sorted = sortBatchesByFefo(batches);

		assert.equal(sorted[0]!.id, "b-earliest", "Earliest expiration (2026-04-10) must be first");
		assert.equal(sorted[1]!.id, "b-tie-earlier", "Tie-breaker: earlier receivedAt (Jan 15) must precede later (Mar 01)");
		assert.equal(sorted[2]!.id, "b-tie-later", "Tie-breaker: later receivedAt (Mar 01) must come after earlier");
		assert.equal(sorted[3]!.id, "b-far", "Later expiration (2027-12-31) must follow 2026 batches");
		assert.equal(sorted[4]!.id, "b-no-exp", "Batch without expiration date must be sorted last");
	});

	it("2. [Database FEFO Deductions & Status Depletion] depletes batches in strict FEFO sequence and updates item stock", async () => {
		await purgeFixtureOrganizations([orgId]);

		const itemId = fixtureUuid(FIXTURE, 10);
		const batch1Id = fixtureUuid(FIXTURE, 11);
		const batch2Id = fixtureUuid(FIXTURE, 12);
		const batch3Id = fixtureUuid(FIXTURE, 13);

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: "Inquisition Clinic Org",
			});

			await tx.insert(users).values({
				id: userId,
				organizationId: orgId,
				fullName: "Inquisitor Admin",
				role: "admin",
			});

			await tx.insert(inventoryItems).values({
				id: itemId,
				organizationId: orgId,
				name: "Артикаин 4% с адреналином 1:100000",
				stockQuantity: "25",
				currentQty: "25",
				unitCostRub: "120",
			});

			// Batch 1: Exp 2026-06-01, qty 5
			await (tx.insert(stockBatches) as any).values({
				id: batch1Id,
				organizationId: orgId,
				inventoryItemId: itemId,
				batchNumber: "LOT-2026-06",
				expirationDate: "2026-06-01",
				receivedQuantity: "5",
				remainingQty: "5",
				purchasePricePerUnit: "120",
				status: "active",
				createdAt: new Date("2026-01-01"),
			});

			// Batch 2: Exp 2026-08-01, tie-breaker earlier createdAt, qty 10
			await (tx.insert(stockBatches) as any).values({
				id: batch2Id,
				organizationId: orgId,
				inventoryItemId: itemId,
				batchNumber: "LOT-2026-08-A",
				expirationDate: "2026-08-01",
				receivedQuantity: "10",
				remainingQty: "10",
				purchasePricePerUnit: "125",
				status: "active",
				createdAt: new Date("2026-01-10"),
			});

			// Batch 3: Exp 2026-08-01, tie-breaker later createdAt, qty 10
			await (tx.insert(stockBatches) as any).values({
				id: batch3Id,
				organizationId: orgId,
				inventoryItemId: itemId,
				batchNumber: "LOT-2026-08-B",
				expirationDate: "2026-08-01",
				receivedQuantity: "10",
				remainingQty: "10",
				purchasePricePerUnit: "130",
				status: "active",
				createdAt: new Date("2026-02-15"),
			});
		});

		// Deduct 12 units via deductFefo
		await withFixtureTenant(orgId, async (tx) => {
			const res = await fefoStockService.deductFefo(tx, {
				organizationId: orgId,
				inventoryItemId: itemId,
				requiredQty: 12,
				allowOverdraft: false,
				notes: "Клинический расход по протоколу",
			});

			assert.equal(res.deductedQty, 12);
			assert.equal(res.isOverdraft, false);
			assert.equal(res.batchesUsed.length, 2);

			// Batch 1 must be depleted (5 units taken)
			assert.equal(res.batchesUsed[0]!.batchId, batch1Id);
			assert.equal(res.batchesUsed[0]!.quantityDeducted, 5);

			// Batch 2 (tie-breaker winner) must provide remaining 7 units
			assert.equal(res.batchesUsed[1]!.batchId, batch2Id);
			assert.equal(res.batchesUsed[1]!.quantityDeducted, 7);
		});

		// Verify database records
		await withFixtureTenant(orgId, async (tx) => {
			const [b1] = await tx.select().from(stockBatches).where(eq(stockBatches.id, batch1Id));
			assert.equal(Number(b1!.remainingQty), 0);
			assert.equal(b1!.status, "depleted", "Fully exhausted batch must transition to depleted status");

			const [b2] = await tx.select().from(stockBatches).where(eq(stockBatches.id, batch2Id));
			assert.equal(Number(b2!.remainingQty), 3, "Batch 2 must have 3 remaining");
			assert.equal(b2!.status, "active", "Partially exhausted batch remains active");

			const [b3] = await tx.select().from(stockBatches).where(eq(stockBatches.id, batch3Id));
			assert.equal(Number(b3!.remainingQty), 10, "Batch 3 must be untouched");
			assert.equal(b3!.status, "active");

			const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
			assert.equal(Number(item!.stockQuantity), 13, "Total item stock must be 25 - 12 = 13");
		});
	});

	it("3. [Negative Stock Protection] blocks unauthorized overdraft with 409 Conflict, allows overdraft when confirmed", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(orgId, userId);
		const itemId = fixtureUuid(FIXTURE, 10);

		// Current stock is 13 units.
		// Attempting to deduct 20 units with allowOverdraft: false must return 409 Conflict!
		const failRes = await app.inject({
			method: "POST",
			url: `/api/warehouse/${orgId}/deduct`,
			headers,
			payload: {
				items: [
					{
						inventoryItemId: itemId,
						quantity: 20,
						allowOverdraft: false,
					},
				],
			},
		});

		assert.equal(failRes.statusCode, 409, "Must reject deduction with 409 Conflict when overdraft is not allowed");
		const failBody = JSON.parse(failRes.payload);
		assert.equal(failBody.success, false);
		assert.equal(failBody.code, "INSUFFICIENT_STOCK");
		assert.equal(failBody.availableStock, 13);
		assert.equal(failBody.requiredStock, 20);
		assert.equal(failBody.deficitQty, 7);

		// Stock in DB must remain unchanged at 13
		await withFixtureTenant(orgId, async (tx) => {
			const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
			assert.equal(Number(item!.stockQuantity), 13);
		});

		// Now deduct with explicit allowOverdraft: true -> must succeed with 200 OK
		const successRes = await app.inject({
			method: "POST",
			url: `/api/warehouse/${orgId}/deduct`,
			headers,
			payload: {
				items: [
					{
						inventoryItemId: itemId,
						quantity: 15,
						allowOverdraft: true,
					},
				],
			},
		});

		assert.equal(successRes.statusCode, 200, "Must permit overdraft when explicitly confirmed");
		const successBody = JSON.parse(successRes.payload);
		assert.equal(successBody.success, true);
		assert.equal(successBody.hasOverdraft, true);

		// Stock in DB must now be 13 - 15 = -2
		await withFixtureTenant(orgId, async (tx) => {
			const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
			assert.equal(Number(item!.stockQuantity), -2, "Overdrafted stock must decrement to -2");

			const overdraftTx = await tx
				.select()
				.from(inventoryTransactions)
				.where(eq(inventoryTransactions.transactionType, "emergency_overdraft"));
			assert.ok(overdraftTx.length >= 1, "Must record emergency_overdraft transaction in DB");
		});
	});

	it("4. [Concurrency Race Protection] serializes parallel deductions with SELECT ... FOR UPDATE", async () => {
		// Create a separate single-item fixture with stock = 5
		const raceItemId = fixtureUuid(FIXTURE, 20);
		const raceBatchId = fixtureUuid(FIXTURE, 21);

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(inventoryItems).values({
				id: raceItemId,
				organizationId: orgId,
				name: "Стерильные перчатки Нитрил (М)",
				stockQuantity: "5",
				currentQty: "5",
				unitCostRub: "50",
			});

			await (tx.insert(stockBatches) as any).values({
				id: raceBatchId,
				organizationId: orgId,
				inventoryItemId: raceItemId,
				batchNumber: "LOT-RACE-5",
				expirationDate: "2027-01-01",
				receivedQuantity: "5",
				remainingQty: "5",
				purchasePricePerUnit: "50",
				status: "active",
			});
		});

		// Launch 5 parallel deductions of 1 unit each
		const results = await Promise.all(
			Array.from({ length: 5 }, (_, i) =>
				withFixtureTenant(orgId, async (tx) => {
					return await fefoStockService.deductFefo(tx, {
						organizationId: orgId,
						inventoryItemId: raceItemId,
						requiredQty: 1,
						allowOverdraft: false,
						notes: `Параллельное списание потока ${i}`,
					});
				}),
			),
		);

		// Every parallel deduction should successfully deduct 1 unit
		for (const r of results) {
			assert.equal(r.deductedQty, 1);
			assert.equal(r.isOverdraft, false);
		}

		// The final stock must be exactly 0, not negative and not lost updates
		await withFixtureTenant(orgId, async (tx) => {
			const [b] = await tx.select().from(stockBatches).where(eq(stockBatches.id, raceBatchId));
			assert.equal(Number(b!.remainingQty), 0);
			assert.equal(b!.status, "depleted");

			const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, raceItemId));
			assert.equal(Number(item!.stockQuantity), 0);
		});

		// A 6th deduction without overdraft MUST fail with InsufficientStockError
		await assert.rejects(
			async () => {
				await withFixtureTenant(orgId, async (tx) => {
					await fefoStockService.deductFefo(tx, {
						organizationId: orgId,
						inventoryItemId: raceItemId,
						requiredQty: 1,
						allowOverdraft: false,
					});
				});
			},
			(err: any) => err.code === "INSUFFICIENT_STOCK" || err.name === "InsufficientStockError",
			"6th deduction on exhausted stock must throw InsufficientStockError",
		);
	});

	it("5. [Multi-Tender POS Split] validates kopeck precision across Cash, Card, SBP, Deposit, Insurance", () => {
		// Valid split: 15 000 ₽ invoice
		// 5 000.00 cash + 6 000.00 electronic (card/sbp) + 4 000.00 deposit = 15 000.00 ₽
		const validSplit = validateAndResolvePaymentSplit({
			patientId: fixtureUuid(FIXTURE, 50),
			amountRub: 15000,
			cashAmountRub: 5000,
			electronicAmountRub: 6000,
			depositAmountRub: 4000,
			method: "split",
		});

		assert.equal(validSplit.isSplit, true);
		assert.equal(validSplit.resolvedCashKop, 500000);
		assert.equal(validSplit.resolvedElectronicKop, 600000);
		assert.equal(validSplit.resolvedDepositKop, 400000);
		assert.equal(
			validSplit.resolvedCashKop + validSplit.resolvedElectronicKop + validSplit.resolvedDepositKop,
			1500000,
		);

		// Invalid split: 1 kopeck discrepancy (14 999.99 ₽ != 15 000.00 ₽) -> must throw error!
		assert.throws(
			() => {
				validateAndResolvePaymentSplit({
					patientId: fixtureUuid(FIXTURE, 50),
					amountRub: 15000,
					cashAmountRub: 5000,
					electronicAmountRub: 6000,
					depositAmountRub: 3999.99,
					method: "split",
				});
			},
			(err: any) => err.message.includes("не совпадает с общей суммой"),
			"Must reject split with kopeck discrepancy",
		);
	});

	it("6. [Cash Shift Close Guard] rejects closing with 409 when patient is 'in_treatment', succeeds with force: true", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(orgId, userId);

		// Open cash shifts
		const openRes = await app.inject({
			method: "POST",
			url: "/api/cash/cash-box-all-open",
			headers,
			payload: { openedByUserId: userId },
		});
		assert.equal(openRes.statusCode, 200, "Cash shifts must open successfully");

		// Seed patient and an active appointment in 'in_treatment' status
		const activeAppId = fixtureUuid(FIXTURE, 30);
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Смирнов Алексей Викторович",
				phone: "+79991234567",
			});

			await tx.insert(appointments).values({
				id: activeAppId,
				organizationId: orgId,
				patientId,
				doctorUserId: userId,
				status: "in_treatment",
				startsAt: new Date(),
				endsAt: new Date(Date.now() + 3600000),
				reason: "Лечение пульпита 26 зуба",
			});
		});

		// Attempt to close shifts without force -> MUST return 409 UnfinishedVisitsInChair!
		const closeBlockedRes = await app.inject({
			method: "POST",
			url: "/api/cash/cash-box-all-closing",
			headers,
			payload: {
				closedByUserId: userId,
				force: false,
			},
		});

		assert.equal(
			closeBlockedRes.statusCode,
			409,
			"Shift closing must be blocked with 409 when visits are in_treatment",
		);
		const blockedBody = JSON.parse(closeBlockedRes.payload);
		assert.equal(blockedBody.error, "UnfinishedVisitsInChair");
		assert.equal(blockedBody.code, "UNFINISHED_VISITS_IN_CHAIR");
		assert.equal(blockedBody.unfinishedCount, 1);

		// Verify shifts are still OPEN in database
		await withFixtureTenant(orgId, async (tx) => {
			const openShifts = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.status, "open"),
					),
				);
			assert.ok(openShifts.length > 0, "Shifts must remain open after blocked closure");
		});

		// Now close shifts with force: true -> MUST succeed with 200 OK and generate Z-reports!
		const closeForcedRes = await app.inject({
			method: "POST",
			url: "/api/cash/cash-box-all-closing",
			headers,
			payload: {
				closedByUserId: userId,
				force: true,
			},
		});

		assert.equal(closeForcedRes.statusCode, 200, "Shift closing must succeed with force: true");
		const forcedBody = JSON.parse(closeForcedRes.payload);
		assert.equal(forcedBody.success, true);
		assert.ok(forcedBody.closedShiftsCount > 0);

		// Verify shifts are now CLOSED in database
		await withFixtureTenant(orgId, async (tx) => {
			const remainingOpen = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.status, "open"),
					),
				);
			assert.equal(remainingOpen.length, 0, "All shifts of organization must be closed in DB");
		});
	});

	it("7. [Doctor Piecework on Collected Cash] calculates net piecework strictly on cash collected basis with Art. 137/192 LC RF compliance", () => {
		// Scenario:
		// Invoice Total = 20 000 ₽
		// Patient paid 50% = 10 000 ₽ (cash_basis)
		// Lab Cost = 3 000 ₽
		// Expensive Materials = 1 000 ₽
		// Doctor Percent = 25%
		// Disciplinary Penalty attempt = 5 000 ₽ (illegal under Art. 137, 192 LC RF)
		// Stimulating Bonus = 2 000 ₽

		const result = calculateIdentDoctorSalary({
			model: "cash_basis",
			grossRevenueRub: 20000,
			invoiceTotalRub: 20000,
			paidAmountRub: 10000,
			labCostRub: 3000,
			expensiveMaterialsCostRub: 1000,
			doctorPercent: 25,
			bonusesRub: 2000,
			penaltiesRub: 5000, // Should reduce bonuses, but NOT piecework!
			discountPolicy: "proportional",
		});

		// Clinic costs total = 3000 (Lab) + 1000 (Mat) = 4000 ₽
		// Proportional cash basis base at 50% payment:
		// Paid = 10 000 ₽. Clinic costs deducted at 50% = 2 000 ₽.
		// Doctor base = 10 000 - 2 000 = 8 000 ₽ (800 000 kopecks).
		// Piecework at 25% = 2 000 ₽ (200 000 kopecks).
		assert.equal(result.pieceworkAccruedRub, 2000, "Piecework must be exactly 25% of collected net base (2 000 ₽)");

		// Disciplinary fines protection: bonus of 2000 reduced to 0 by penalty,
		// but penalty cannot eat into piecework!
		assert.equal(result.effectiveBonusesRub, 0, "Stimulating bonus reduced to 0 by penalty");
		assert.equal(result.pieceworkAccruedRub, 2000, "Statutory piecework cannot be reduced by penalties (Art. 137, 192 LC RF)");
		assert.equal(result.totalAccruedRub, 2000, "Total accrued before tax is exactly 2 000 ₽");

		// After 13% NDFL: 2000 - 260 = 1 740 ₽ net payout
		assert.equal(result.ndflTaxRub, 260, "13% NDFL must be 260 ₽");
		assert.equal(result.netPayoutRub, 1740, "Net payout on hands must be 1 740 ₽");
	});
});
