import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { recordAuditEventInDb } from "./auditQuery.js";
import { db } from "./client.js";
import { auditEvents, organizations, users } from "./schema.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";

describe("recordAuditEventInDb", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("successfully inserts and returns an audit event with all fields", async () => {
		const mockDate = new Date("2024-01-01T00:00:00.000Z");
		mock.method(db, "insert", () => ({
			values: () => ({
				returning: async () => [
					{
						id: "test-id",
						organizationId: "org-1",
						actorUserId: "user-1",
						entityType: "patient",
						entityId: "patient-1",
						action: "create",
						reason: "test reason",
						createdAt: mockDate,
					},
				],
			}),
		}));

		const result = await recordAuditEventInDb("org-1", {
			entityType: "patient",
			entityId: "patient-1",
			action: "create",
			reason: "test reason",
			actorUserId: "user-1",
		});

		assert.strictEqual(result.id, "test-id");
		assert.strictEqual(result.organizationId, "org-1");
		assert.strictEqual(result.actorUserId, "user-1");
		assert.strictEqual(result.entityType, "patient");
		assert.strictEqual(result.entityId, "patient-1");
		assert.strictEqual(result.action, "create");
		assert.strictEqual(result.reason, "test reason");
		assert.strictEqual(result.createdAt, mockDate.toISOString());
	});

	test("successfully inserts with minimal required fields", async () => {
		const mockDate = new Date("2024-01-01T00:00:00.000Z");
		mock.method(db, "insert", () => ({
			values: () => ({
				returning: async () => [
					{
						id: "test-id-2",
						organizationId: "org-2",
						actorUserId: null,
						entityType: "document",
						entityId: "doc-1",
						action: "update",
						reason: null,
						createdAt: mockDate,
					},
				],
			}),
		}));

		const result = await recordAuditEventInDb("org-2", {
			entityType: "document",
			entityId: "doc-1",
			action: "update",
		});

		assert.strictEqual(result.id, "test-id-2");
		assert.strictEqual(result.organizationId, "org-2");
		assert.strictEqual(result.actorUserId, null);
		assert.strictEqual(result.entityType, "document");
		assert.strictEqual(result.entityId, "doc-1");
		assert.strictEqual(result.action, "update");
		assert.strictEqual(result.reason, null);
		assert.strictEqual(result.createdAt, mockDate.toISOString());
	});

	test("throws an error if insert returns empty array", async () => {
		mock.method(db, "insert", () => ({
			values: () => ({
				returning: async () => [],
			}),
		}));

		await assert.rejects(
			async () => {
				await recordAuditEventInDb("org-1", {
					entityType: "patient",
					entityId: "patient-1",
					action: "create",
				});
			},
			(err: Error) => {
				assert.strictEqual(err.message, "Failed to insert audit event");
				return true;
			},
		);
	});

	test("persists audit event with actorUserId inside real PG18 tenant transaction", async (t) => {
		const NS = "auditQueryPg";
		const ORG_ID = fixtureUuid(NS, 1);
		const ACTOR_ID = fixtureUuid(NS, 2);
		const entityId = `doc-${Date.now()}`;

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: ORG_ID, name: "Audit Query PG Test" })
					.onConflictDoUpdate({
						target: organizations.id,
						set: { name: "Audit Query PG Test" },
					});
				await tx
					.insert(users)
					.values({
						id: ACTOR_ID,
						organizationId: ORG_ID,
						fullName: "Врач Аудитов",
						role: "doctor",
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							organizationId: ORG_ID,
							fullName: "Врач Аудитов",
							role: "doctor",
						},
					});

				const created = await recordAuditEventInDb(
					ORG_ID,
					{
						entityType: "document",
						entityId,
						action: "document_issued",
						reason: "Проверка транзакционной записи",
						actorUserId: ACTOR_ID,
					},
					tx,
				);

				assert.strictEqual(created.actorUserId, ACTOR_ID);

				const rows = await tx
					.select()
					.from(auditEvents)
					.where(and(eq(auditEvents.organizationId, ORG_ID), eq(auditEvents.id, created.id)));
				assert.strictEqual(rows.length, 1);
				assert.strictEqual(rows[0]!.actorUserId, ACTOR_ID);
			});
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				t.skip("PostgreSQL unavailable");
				return;
			}
			throw err;
		}
	});
});
