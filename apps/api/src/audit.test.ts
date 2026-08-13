import assert from "node:assert";
import { beforeEach, describe, test, afterEach } from "node:test";
import { recordAuditEvent } from "./audit.js";
import { db } from "./db/client.js";
import { auditEvents, organizations, users } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./tests/support/fixtureOrganizations.js";
import { withSuperuserBypass } from "./db/rls.js";

const RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let testIndex = 0;
let orgId: string;

describe("recordAuditEvent", () => {
	beforeEach(async () => {
		testIndex++;
		orgId = fixtureUuid(`audit-${RUN_ID}`, testIndex);
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async () => {
			await db
				.insert(organizations)
				.values([
					{ id: orgId, name: "Audit Test Org", schemaVersion: 1 },
				])
				.onConflictDoNothing();
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("inserts audit event with provided organizationId", async (t) => {
		await withFixtureTenant(orgId, async () => {
			await recordAuditEvent({
				organizationId: orgId,
				entityType: "User",
				entityId: "user-456",
				action: "LOGIN",
				reason: "Successful login",
			});

			const events = await db
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.organizationId, orgId))
				.orderBy(desc(auditEvents.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].entityType, "User");
			assert.strictEqual(events[0].entityId, "user-456");
			assert.strictEqual(events[0].action, "LOGIN");
			assert.strictEqual(events[0].reason, "Successful login");
			assert.strictEqual(events[0].actorUserId, null);
		});
	});

	test("записывает автора события, когда вызывающий его передал", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const userId = fixtureUuid(`audit-user-${RUN_ID}`, 1);
			await withSuperuserBypass(async () => {
				await db.insert(users).values({
					id: userId,
					fullName: "Test User",
					phone: "+79991234567",
					role: "admin",
					organizationId: orgId,
				});
			});
			
			await recordAuditEvent({
				organizationId: orgId,
				actorUserId: userId,
				entityType: "document",
				entityId: "doc-1",
				action: "document_voided",
				reason: null,
			});

			const events = await db
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.organizationId, orgId))
				.orderBy(desc(auditEvents.createdAt));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].actorUserId, userId);
		});
	});

	test("fetches first organization when organizationId is missing", async (t) => {
		const [firstOrg] = await db.select().from(organizations).limit(1);
		assert.ok(firstOrg, "База должна содержать хотя бы одну организацию");
		await withFixtureTenant(firstOrg.id, async () => {
			await recordAuditEvent({
				entityType: "Post",
				entityId: "post-1",
				action: "CREATE",
			});

			const events = await db
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.organizationId, firstOrg.id))
				.orderBy(desc(auditEvents.createdAt));

			assert.strictEqual(events.length >= 1, true);
			assert.strictEqual(events[0].organizationId, firstOrg.id);
			assert.strictEqual(events[0].entityType, "Post");
			assert.strictEqual(events[0].action, "CREATE");
		});
	});

	test("при неопределённой клинике бросает ошибку, а не молчит", async (t) => {
		// Non-existent organizationId causes DB rejection due to FK constraint / RLS
		await assert.rejects(
			() =>
				recordAuditEvent({
					organizationId: "00000000-0000-0000-0000-000000000000",
					entityType: "Comment",
					entityId: "comment-1",
					action: "DELETE",
				}),
			(err: any) => /violates foreign key|нарушает ограничение|42501|23503/i.test(`${err?.message || ""} ${err?.cause?.message || ""}`)
		);
	});
});
