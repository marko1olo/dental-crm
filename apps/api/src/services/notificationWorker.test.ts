import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { withSuperuserBypass } from "../db/rls.js";
import { outgoingNotifications, patients } from "../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import * as workerModule from "./notificationWorker.js";

const orgId = fixtureUuid("m4.notificationWorker", 0);
const patientId = fixtureUuid("m4.notificationWorker", 1);

describe("startNotificationWorker", () => {
	before(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async (tx) => {
			await tx.execute(
				sql`INSERT INTO organizations (id, name) VALUES (${orgId}::uuid, 'M4 Notification Org') ON CONFLICT DO NOTHING`,
			);
		});
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "M4 Notification Patient",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("startNotificationWorker processes pending notifications in DB", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval"] });

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(outgoingNotifications).values({
				organizationId: orgId,
				patientId: patientId,
				type: "Test_Notice",
				payload: { text: "Notification test message" },
				status: "pending",
				scheduledAt: new Date(),
			});
		});

		workerModule.startNotificationWorker();

		t.mock.timers.tick(10000);

		let notifs: Array<typeof outgoingNotifications.$inferSelect> = [];
		for (let i = 0; i < 20; i++) {
			notifs = await withFixtureTenant(orgId, async (tx) => {
				return tx
					.select()
					.from(outgoingNotifications)
					.where(eq(outgoingNotifications.organizationId, orgId));
			});
			if (notifs[0]?.status !== "pending") break;
			await new Promise((r) => setTimeout(r, 50));
		}

		assert.strictEqual(notifs.length, 1);
		assert.strictEqual(notifs[0]?.status, "failed");
		assert.strictEqual(notifs[0]?.type, "Test_Notice");

		t.mock.timers.reset();
	});
});
