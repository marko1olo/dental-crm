import assert from "node:assert";
import { describe, test, beforeEach, afterEach } from "node:test";
import { recordAuditEventInDb } from "./auditQuery.js";
import { db } from "./client.js";
import { auditEvents, organizations, users } from "./schema.js";
import { eq, desc } from "drizzle-orm";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { withSuperuserBypass } from "./rls.js";

const RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let testIndex = 0;
let orgId: string;

describe("recordAuditEventInDb", () => {
	beforeEach(async () => {
		testIndex++;
		orgId = fixtureUuid(`audit-query-${RUN_ID}`, testIndex);
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async () => {
			await db
				.insert(organizations)
				.values([
					{ id: orgId, name: "Audit Query Test Org", schemaVersion: 1 },
				])
				.onConflictDoNothing();
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("successfully inserts and returns an audit event with all fields", async () => {
		await withFixtureTenant(orgId, async () => {
			const userId = fixtureUuid(`audit-query-user-${RUN_ID}`, 1);
			await withSuperuserBypass(async () => {
				await db.insert(users).values({
					id: userId,
					fullName: "Test User",
					phone: "+79991112233",
					role: "admin",
					organizationId: orgId,
				});
			});

			const result = await recordAuditEventInDb(orgId, {
				entityType: "patient",
				entityId: "patient-1",
				action: "create",
				reason: "test reason",
				actorUserId: userId,
			});

			assert.ok(result.id);
			assert.strictEqual(result.organizationId, orgId);
			assert.strictEqual(result.actorUserId, userId);
			assert.strictEqual(result.entityType, "patient");
			assert.strictEqual(result.entityId, "patient-1");
			assert.strictEqual(result.action, "create");
			assert.strictEqual(result.reason, "test reason");
			assert.ok(result.createdAt);

			// Verify it actually went to the DB
			const events = await db
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.id, result.id));
			
			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].entityType, "patient");
		});
	});

	test("successfully inserts with minimal required fields", async () => {
		await withFixtureTenant(orgId, async () => {
			const result = await recordAuditEventInDb(orgId, {
				entityType: "document",
				entityId: "doc-1",
				action: "update",
			});

			assert.ok(result.id);
			assert.strictEqual(result.organizationId, orgId);
			assert.strictEqual(result.actorUserId, null);
			assert.strictEqual(result.entityType, "document");
			assert.strictEqual(result.entityId, "doc-1");
			assert.strictEqual(result.action, "update");
			assert.strictEqual(result.reason, null);
			assert.ok(result.createdAt);

			// Verify it actually went to the DB
			const events = await db
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.id, result.id));
			
			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].entityType, "document");
		});
	});
});
