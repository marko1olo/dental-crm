/**
 * apps/api/src/tests/routes/sterilizationKitWriteOffInquisitor.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1-Click Sterilization Kit Consumable Deduction & Soft Negative Stock (Mandates 8e, 8n).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	users,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { executeQuickPackageWriteOff } from "../../routes/inventory/writeOffModules/writeOffVisitBundleExecution.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `sterilKitTest_${Date.now()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const NURSE_ID = fixtureUuid(NAMESPACE, 2);

describe("Sterilization Kit 1-Click Write-Off & Soft Negative Stock Inquisitor Gate", () => {
	let app: FastifyInstance;
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		const secret = authTokenSecret();
		staffToken = signToken(
			{
				userId: NURSE_ID,
				role: "assistant",
				organizationId: ORG_ID,
				fullName: "Медсестра ЦСО Тестовая",
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Стерилизации ДЕНТЕ",
					inn: "7701998811",
				})
				.onConflictDoNothing();

			await tx.insert(users).values({
				id: NURSE_ID,
				organizationId: ORG_ID,
				fullName: "Медсестра ЦСО Тестовая",
				email: `nurse-cso-${Date.now()}@dente.ru`,
				role: "assistant",
				passwordHash: "hash",
			});
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	function authHeaders(extra: Record<string, string> = {}) {
		return {
			Authorization: `Bearer ${staffToken}`,
			[STAFF_TOKEN_HEADER]: staffToken,
			[CLINIC_TOKEN_HEADER]: staffToken,
			"Content-Type": "application/json",
			...extra,
		};
	}

	it("1. quickWriteoffSterilizationKit auto-creates uncataloged items with 0 stock and records soft overdraft", async () => {
		const result = await withFixtureTenant(ORG_ID, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffSterilizationKit(tx, {
				organizationId: ORG_ID,
				count: 2,
				userId: NURSE_ID,
				notes: "Тестовая стерилизация 2 лотков",
			});
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isOverdraft, true);
		assert.strictEqual(result.deductedItems.length, 4);

		// Крафт-пакеты: 2 шт, остаток -2
		const kraft = result.deductedItems.find((i) => i.itemName.includes("Крафт-пакет"));
		assert.ok(kraft, "Kraft pouches must be deducted");
		assert.strictEqual(kraft.quantity, 2);
		assert.strictEqual(kraft.remainingStock, -2);
		assert.strictEqual(kraft.isOverdraft, true);

		// Индикаторы 5 класс: 2 шт, остаток -2
		const indicator = result.deductedItems.find((i) => i.itemName.includes("Индикаторы"));
		assert.ok(indicator, "Class 5 indicators must be deducted");
		assert.strictEqual(indicator.quantity, 2);
		assert.strictEqual(indicator.remainingStock, -2);
		assert.strictEqual(indicator.isOverdraft, true);

		// Перчатки: 2 лотка * 2 пары = 4 пары, остаток -4
		const gloves = result.deductedItems.find((i) => i.itemName.includes("Перчатки"));
		assert.ok(gloves, "Gloves must be deducted (2 pairs per tray)");
		assert.strictEqual(gloves.quantity, 4);
		assert.strictEqual(gloves.remainingStock, -4);
		assert.strictEqual(gloves.isOverdraft, true);

		// Дезсалфетки: 2 шт, остаток -2
		const wipes = result.deductedItems.find((i) => i.itemName.includes("Салфетки"));
		assert.ok(wipes, "Disinfectant wipes must be deducted");
		assert.strictEqual(wipes.quantity, 2);
		assert.strictEqual(wipes.remainingStock, -2);
		assert.strictEqual(wipes.isOverdraft, true);

		// Проверяем, что в БД зафиксированы транзакции emergency_overdraft
		const txs = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.transactionType, "emergency_overdraft"),
					),
				);
		});
		assert.ok(txs.length >= 4, "Must insert transactions with emergency_overdraft");
	});

	it("2. executeQuickPackageWriteOff routes packageId='sterilization_kit' to sterilization write-off", async () => {
		const res = await withFixtureTenant(ORG_ID, async (tx) => {
			return executeQuickPackageWriteOff(tx, {
				organizationId: ORG_ID,
				packageId: "sterilization_kit",
				quantityMultiplier: 1,
				effectiveUserId: NURSE_ID,
			});
		});

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.deductedItems.length, 4);
		const kraft = res.deductedItems.find((i: any) => i.itemName.includes("Крафт-пакет"));
		assert.strictEqual(kraft.quantity, 1);
		// Было -2, списали 1 -> стало -3
		assert.strictEqual(kraft.remainingStock, -3);
	});

	it("3. HTTP POST /:organizationId/quick-writeoff-sterilization-kit returns 200 with soft overdraft", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/quick-writeoff-sterilization-kit`,
			headers: authHeaders(),
			payload: {
				count: 1,
				notes: "Стерилизация смены",
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.isOverdraft, true);
		assert.strictEqual(json.deductedItems.length, 4);
	});

	it("4. HTTP POST /quick-writeoff-sterilization-kit works via Dual-Route Parity", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/inventory/quick-writeoff-sterilization-kit",
			headers: authHeaders(),
			payload: {
				count: 2,
				organizationId: ORG_ID,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.isOverdraft, true);
	});
});
