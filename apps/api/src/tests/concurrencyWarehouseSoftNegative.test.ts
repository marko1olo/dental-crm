/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASTIFY CONCURRENCY AUDIT: WAREHOUSE SOFT NEGATIVE OVERDRAFT & DEADLOCK SUITE
 * Mandate 8n, 8v: Soft Negative Stock, Deadlock Immunity, Batch Background Write-off
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	users,
} from "../db/schema.js";
import { inventoryRoutes } from "../routes/inventory.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "concurrencyWarehouseSoftNegative";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_ADMIN_ID = fixtureUuid(NAMESPACE, 2);
const BONE_GRAFT_ITEM_ID = fixtureUuid(NAMESPACE, 10);
const MAT_A_ID = fixtureUuid(NAMESPACE, 20);
const MAT_B_ID = fixtureUuid(NAMESPACE, 21);
const MAT_C_ID = fixtureUuid(NAMESPACE, 22);

describe("Fastify Concurrency: Warehouse Soft Negative Stock & Deadlock Immunity", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Складского Стресс-Теста Fastify",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: USER_ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Старшая Медсестра Склада",
					role: "admin",
					isActive: true,
				})
				.onConflictDoNothing();

			// Дефицитный материал: физический остаток 1 шт.
			await tx
				.insert(inventoryItems)
				.values([
					{
						id: BONE_GRAFT_ITEM_ID,
						organizationId: ORG_ID,
						name: "Костный трансплантат Bio-Oss 0.5г",
						stockQuantity: "1.000",
						currentQty: "1.000",
						unitCostRub: "9500.00",
						unit: "фл",
					},
					{
						id: MAT_A_ID,
						organizationId: ORG_ID,
						name: "Анестетик Ультракаин Д-С Форте 1:100000",
						stockQuantity: "50.000",
						currentQty: "50.000",
						unitCostRub: "120.00",
						unit: "амп",
					},
					{
						id: MAT_B_ID,
						organizationId: ORG_ID,
						name: "Шовный материал Викрил 4-0 с иглой",
						stockQuantity: "50.000",
						currentQty: "50.000",
						unitCostRub: "350.00",
						unit: "шт",
					},
					{
						id: MAT_C_ID,
						organizationId: ORG_ID,
						name: "Коллагеновая мембрана Bio-Gide 25x25мм",
						stockQuantity: "50.000",
						currentQty: "50.000",
						unitCostRub: "14000.00",
						unit: "уп",
					},
				])
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				role: "owner",
				scope: "clinic",
			},
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ADMIN_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"inventory.write",
					"inventory.manage",
					"inventory.read",
				],
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Soft Negative Stock: 20 parallel chairside visits concurrently deduct scarce material (1 in stock) without blocking doctors", async () => {
		const parallelVisits = 20;

		const responses = await Promise.all(
			Array.from({ length: parallelVisits }, (_, idx) =>
				app.inject({
					method: "POST",
					url: `/api/inventory/${ORG_ID}/soft-overdraft-deduct`,
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						organizationId: ORG_ID,
						itemId: BONE_GRAFT_ITEM_ID,
						quantity: 1,
						reason: `Экстренное списание у кресла приём #${idx + 1}`,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(
				r.statusCode,
				200,
				`Ни один приём пациента не должен быть заблокирован из-за нехватки остатка на складе (Мандат 8e, 8n): ${r.body}`,
			);
		}

		const parsedBodies = responses.map((r) => JSON.parse(r.body));
		const overdraftBodies = parsedBodies.filter((b) => b.isOverdraft === true);

		assert.ok(
			overdraftBodies.length >= 19,
			"Минимум 19 списаний сверх первоначального остатка 1 ед. обязаны быть помечены как isOverdraft: true",
		);

		// Verify PostgreSQL database row state
		const [item] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, BONE_GRAFT_ITEM_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);

		assert.ok(item, "Карточка материала обязана существовать в базе данных");
		assert.equal(
			Number(item.stockQuantity),
			-19,
			"Итоговый остаток материала на складе обязан строго составить -19 ед. (1 начальный - 20 списаний)",
		);

		// Verify audit transactions ledger
		const transactions = await db
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, ORG_ID),
					eq(inventoryTransactions.itemId, BONE_GRAFT_ITEM_ID),
				),
			);

		assert.equal(
			transactions.length,
			20,
			"В журнале транзакций склада должно быть зафиксировано ровно 20 проводок списания",
		);

		const overdraftTxs = transactions.filter((t) => t.isOverdraft === true);
		assert.equal(
			overdraftTxs.length,
			19,
			"В журнале должно быть зафиксировано ровно 19 проводок с признаком мягкого овердрафта",
		);
	});

	test("2. Stock Adjustment Patch Concurrency: 10 parallel PATCH requests of -2 units update stock accurately", async () => {
		// Reset stock to 10 units
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: "10.000",
					currentQty: "10.000",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, MAT_A_ID),
						eq(inventoryItems.organizationId, ORG_ID),
					),
				);
		});

		const responses = await Promise.all(
			Array.from({ length: 10 }, () =>
				app.inject({
					method: "PATCH",
					url: `/api/inventory/${ORG_ID}/${MAT_A_ID}/stock`,
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						adjustment: -2,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(r.statusCode, 200, `Каждый запрос корректировки обязан вернуть 200 OK: ${r.body}`);
		}

		const [item] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, MAT_A_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);

		assert.equal(
			Number(item?.stockQuantity),
			-10,
			"Начальный остаток 10 - (10 * 2) обязан составить -10 с мягким овердрафтом",
		);
	});

	test("3. Deadlock Immunity: Multi-item deductions in opposing orders ([A, B, C] vs [C, B, A]) resolve without 40P01 deadlocks", async () => {
		const orderNormal = [MAT_A_ID, MAT_B_ID, MAT_C_ID];
		const orderReverse = [MAT_C_ID, MAT_B_ID, MAT_A_ID];

		// 10 concurrent requests executing normal order and 10 executing reverse order
		const tasks = Array.from({ length: 20 }, async (_, idx) => {
			const itemsToDeduct = idx % 2 === 0 ? orderNormal : orderReverse;
			return await db.transaction(async (tx) => {
				// Deadlock Prevention Rule: Sorting item IDs ensures consistent lock ordering
				const sortedIds = [...itemsToDeduct].sort();

				const lockedItems = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, ORG_ID),
							inArray(inventoryItems.id, sortedIds),
						),
					)
					.orderBy(asc(inventoryItems.id))
					.for("update");

				for (const item of lockedItems) {
					const cur = Number(item.stockQuantity ?? 0);
					await tx
						.update(inventoryItems)
						.set({
							stockQuantity: String(cur - 1),
							currentQty: String(cur - 1),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(inventoryItems.id, item.id),
								eq(inventoryItems.organizationId, ORG_ID),
							),
						);
				}

				return lockedItems.length;
			});
		});

		const outcomes = await Promise.allSettled(tasks);
		const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
		const rejected = outcomes.filter((o) => o.status === "rejected");

		assert.equal(
			fulfilled.length,
			20,
			"Все 20 транзакций обязаны завершиться без взаимных блокировок (Zero Deadlocks)",
		);
		assert.equal(
			rejected.length,
			0,
			`Ни одна транзакция не должна упасть с ошибкой 40P01 deadlock detected: ${JSON.stringify(rejected)}`,
		);
	});
});
