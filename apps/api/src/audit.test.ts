import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { recordAuditEvent } from "./audit.js";
import { db } from "./db/client.js";
import { auditEvents, organizations, users } from "./db/schema.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "./tests/support/fixtureOrganizations.js";
import { eq, inArray, sql } from "drizzle-orm";
import { withSuperuserBypass } from "./db/rls.js";

const ORG_ID = fixtureUuid("auditTest", 1);
const FALLBACK_ORG_ID = fixtureUuid("auditTest", 2);
const USER_ID = fixtureUuid("user", 1);

async function purgeAuditEvents(orgIds: string[]) {
    await withSuperuserBypass(async (tx) => {
        let appendOnlyTriggerDisabled = false;
        try {
            try {
                await tx.execute(sql`ALTER TABLE audit_events DISABLE TRIGGER audit_events_append_only`);
                appendOnlyTriggerDisabled = true;
            } catch (error) {
                const code = (error as { cause?: { code?: string } }).cause?.code;
                if (code !== "42704") throw error;
            }
            await tx.delete(auditEvents).where(inArray(auditEvents.organizationId, orgIds));
        } finally {
            if (appendOnlyTriggerDisabled) {
                await tx.execute(sql`ALTER TABLE audit_events ENABLE ALWAYS TRIGGER audit_events_append_only`);
            }
        }
    });
}
describe("recordAuditEvent", () => {
	before(async () => {
		await purgeAuditEvents([ORG_ID, FALLBACK_ORG_ID]);
		await purgeFixtureOrganizations([ORG_ID, FALLBACK_ORG_ID]);
	});

	after(async () => {
		await purgeAuditEvents([ORG_ID, FALLBACK_ORG_ID]);
		await purgeFixtureOrganizations([ORG_ID, FALLBACK_ORG_ID]);
	});

	test("inserts audit event with provided organizationId", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({ id: ORG_ID, name: "Test Org" });
			
			await recordAuditEvent(
				{
					organizationId: "  " + ORG_ID + "  ", // tests trim
					entityType: "User",
					entityId: "user-456",
					action: "LOGIN",
					reason: "Successful login",
				}
			);

			const events = await tx
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.organizationId, ORG_ID));
			
			assert.strictEqual(events.length, 1);
			const event = events[0]!;
			assert.strictEqual(event.organizationId, ORG_ID);
			assert.strictEqual(event.entityType, "User");
			assert.strictEqual(event.entityId, "user-456");
			assert.strictEqual(event.action, "LOGIN");
			assert.strictEqual(event.reason, "Successful login");
			assert.strictEqual(event.actorUserId, null);
		});
	});

	test("записывает автора события, когда вызывающий его передал", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			// We MUST insert the organization and the user first to satisfy foreign keys
			await tx.insert(organizations).values({ id: ORG_ID, name: "Test Org 2" }).onConflictDoNothing();
			await tx.insert(users).values({ id: USER_ID, organizationId: ORG_ID, fullName: "Test User", role: "admin" }).onConflictDoNothing();

			await recordAuditEvent(
				{
					organizationId: ORG_ID,
					actorUserId: USER_ID,
					entityType: "document",
					entityId: "doc-1",
					action: "document_voided",
					reason: null,
				}
			);

			const events = await tx
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.action, "document_voided"));

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0]!.actorUserId, USER_ID);
		});
	});

	test("fetches first organization when organizationId is missing", async () => {
		await withFixtureTenant(FALLBACK_ORG_ID, async (tx) => {
			await tx.insert(organizations).values({ id: FALLBACK_ORG_ID, name: "Fallback Org" }).onConflictDoNothing();

			await recordAuditEvent(
				{
					entityType: "Post",
					entityId: "post-1",
					action: "CREATE",
				}
			);

			const events = await tx
				.select()
				.from(auditEvents)
				.where(eq(auditEvents.entityId, "post-1"));

			assert.strictEqual(events.length, 1);
			const event = events[0]!;
			assert.strictEqual(event.organizationId, FALLBACK_ORG_ID);
			assert.strictEqual(event.action, "CREATE");
		});
	});

	test("при неопределённой клинике бросает ошибку, а не молчит", async () => {
		// Run without tenant context so it can't find app.current_tenant
		await assert.rejects(
			() =>
				recordAuditEvent({
					entityType: "Comment",
					entityId: "comment-1",
					action: "DELETE",
				}),
			/клиника не определена/
		);
	});

	test("отказ базы пробрасывается вызывающему, а не проглатывается", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({ id: ORG_ID, name: "Test Org" }).onConflictDoNothing();
			const NON_EXISTENT_ORG_ID = fixtureUuid("auditTest", 999);

			await assert.rejects(
				() =>
					recordAuditEvent(
						{
							organizationId: NON_EXISTENT_ORG_ID, // Mismatched and non-existent tenant
							entityType: "document",
							entityId: "doc-1",
							action: "document_issued",
						}
					),
				(err: any) => err.message.includes("Failed query: insert into \"audit_events\"") || err.cause?.message.includes("foreign key constraint")
			);
		});
	});
});
