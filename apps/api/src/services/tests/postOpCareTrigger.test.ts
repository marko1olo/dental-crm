import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { outgoingNotifications, patients } from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import { triggerPostOpCare } from "../postOpCareTrigger.js";

const orgId = fixtureUuid("m4.postOpCareTrigger", 0);
const patientId = fixtureUuid("m4.postOpCareTrigger", 1);

describe("postOpCareTrigger", () => {
	before(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async (tx) => {
			await tx.execute(
				sql`INSERT INTO organizations (id, name) VALUES (${orgId}::uuid, 'M4 PostOp Org') ON CONFLICT DO NOTHING`,
			);
		});
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "PostOp Patient",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("triggerPostOpCare inserts correct notification into PostgreSQL database", async () => {
		await triggerPostOpCare(orgId, patientId, "Extraction");

		const rows = await withFixtureTenant(orgId, async (tx) => {
			return tx
				.select()
				.from(outgoingNotifications)
				.where(eq(outgoingNotifications.organizationId, orgId));
		});

		assert.strictEqual(rows.length, 1);
		const notif = rows[0];
		assert.ok(notif);
		assert.strictEqual(notif.organizationId, orgId);
		assert.strictEqual(notif.patientId, patientId);
		assert.strictEqual(notif.type, "PostOp_Care");
		assert.strictEqual(notif.status, "pending");
		assert.deepStrictEqual(notif.payload, {
			patientId: patientId,
			itemTitle: "Extraction",
			alertMessage: `Позвонить пациенту (ID: ${patientId}) - контроль самочувствия после: Extraction`,
		});
	});
});
