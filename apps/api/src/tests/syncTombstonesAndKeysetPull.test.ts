import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { computePayloadHash, createCompositeIdempotencyKey } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { organizations, patients, syncTombstones } from "../db/schema.js";
import { SyncGatewayService } from "../services/sync/syncGatewayService.js";
import { SyncStreamTransport } from "../services/sync/syncGateway/syncStreamTransport.js";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "./support/fixtureOrganizations.js";

const NS = "syncTombstonesAndKeysetPull";
const KEYSET_ORG_ID = fixtureUuid(NS, 1);
const TOMB_ORG_ID = fixtureUuid(NS, 2);

describe("Sync Tombstones & Tuple Keyset Pagination (PG18 Integration)", () => {
	before(async () => {
		await purgeFixtureOrganizations([KEYSET_ORG_ID, TOMB_ORG_ID]).catch(() => {});
	});

	after(async () => {
		await purgeFixtureOrganizations([KEYSET_ORG_ID, TOMB_ORG_ID]).catch(() => {});
	});

	it("paginates rows with identical updatedAt timestamps without skipping or looping via (updatedAt, id) tuple keyset", async () => {
		const identicalTs = new Date("2026-11-27T10:00:00.000Z");
		const p1Id = fixtureUuid(NS, 101);
		const p2Id = fixtureUuid(NS, 102);
		const p3Id = fixtureUuid(NS, 103);

		await withFixtureTenant(KEYSET_ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: KEYSET_ORG_ID, name: "Keyset Pull Test Clinic" })
				.onConflictDoNothing();
			await tx.insert(patients).values([
				{
					id: p1Id,
					organizationId: KEYSET_ORG_ID,
					fullName: "Ключников Первый",
					status: "active",
					createdAt: identicalTs,
					updatedAt: identicalTs,
				},
				{
					id: p2Id,
					organizationId: KEYSET_ORG_ID,
					fullName: "Ключников Второй",
					status: "active",
					createdAt: identicalTs,
					updatedAt: identicalTs,
				},
				{
					id: p3Id,
					organizationId: KEYSET_ORG_ID,
					fullName: "Ключников Третий",
					status: "active",
					createdAt: identicalTs,
					updatedAt: identicalTs,
				},
			]);
		});

		const beforeTs = new Date(identicalTs.getTime() - 1000).toISOString();
		const page1 = await SyncStreamTransport.pullChanges(KEYSET_ORG_ID, beforeTs, { limit: 2 });
		assert.equal(page1.patients.length, 2);
		assert.equal(page1.hasMore, true);
		assert.ok(page1.nextCursor, "Page 1 must emit composite nextCursor");

		const page2 = await SyncStreamTransport.pullChanges(KEYSET_ORG_ID, undefined, {
			limit: 2,
			cursor: page1.nextCursor!,
		});
		assert.equal(page2.patients.length, 1, "Page 2 must emit the remaining 3rd patient even with identical updatedAt");
		assert.equal(page2.hasMore, false);
		assert.equal(page2.nextCursor, null);

		const allIds = [...page1.patients, ...page2.patients].map((p) => (p as { id: string }).id);
		assert.equal(new Set(allIds).size, 3, "Zero duplicate or missing patients across pages");
		assert.ok(allIds.includes(p1Id));
		assert.ok(allIds.includes(p2Id));
		assert.ok(allIds.includes(p3Id));
	});

	it("writes sync_tombstones on action='delete', archives entity, and returns tombstones in pullChanges", async () => {
		const patientId = fixtureUuid(NS, 201);

		await withFixtureTenant(TOMB_ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: TOMB_ORG_ID, name: "Tombstone Test Clinic" })
				.onConflictDoNothing();
			await tx.insert(patients).values({
				id: patientId,
				organizationId: TOMB_ORG_ID,
				fullName: "Удаляемый Пациент",
				status: "active",
			});
		});

		const delPayload = { reason: "Ошибочная карточка" };
		const mutId = fixtureUuid(NS, 202);
		const pushRes = await SyncGatewayService.processPushBatch(TOMB_ORG_ID, {
			syncBatchId: fixtureUuid(NS, 203),
			clientId: "client-tombstone-test",
			sentAt: new Date().toISOString(),
			mutations: [
				{
					mutationId: mutId,
					idempotencyKey: createCompositeIdempotencyKey(mutId, delPayload),
					payloadHash: computePayloadHash(delPayload),
					entityKind: "patient",
					entityId: patientId,
					action: "delete",
					payload: delPayload,
					updatedAt: new Date().toISOString(),
				},
			],
		});

		assert.equal(pushRes.appliedCount, 1);
		assert.equal(pushRes.rejectedCount, 0);

		await withFixtureTenant(TOMB_ORG_ID, async (tx) => {
			const [archivedRow] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.organizationId, TOMB_ORG_ID), eq(patients.id, patientId)));
			assert.equal(archivedRow?.status, "archived");

			const [tombRow] = await tx
				.select()
				.from(syncTombstones)
				.where(and(eq(syncTombstones.organizationId, TOMB_ORG_ID), eq(syncTombstones.entityId, patientId)));
			assert.ok(tombRow, "Tombstone row must exist in PostgreSQL sync_tombstones");
			assert.equal(tombRow.entityKind, "patient");
		});

		const pullRes = await SyncStreamTransport.pullChanges(TOMB_ORG_ID);
		assert.ok(Array.isArray(pullRes.tombstones));
		const pulledTomb = pullRes.tombstones.find(
			(t) => (t as { entityId?: string }).entityId === patientId,
		) as { entityKind?: string; entityId?: string; reason?: string } | undefined;
		assert.ok(pulledTomb, "pullChanges must include deletion tombstone");
		assert.equal(pulledTomb.entityKind, "patient");
		assert.equal(pulledTomb.reason, "Ошибочная карточка");
	});
});
