import assert from "node:assert";
import { describe, test } from "node:test";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "../../tests/support/fixtureOrganizations.js";
import { triggerPostOpCare } from "../postOpCareTrigger.js";

describe("postOpCareTrigger", () => {
	test("triggerPostOpCare enqueues service message into outbox", async () => {
		const orgId = fixtureUuid("postOpCare", 1);
		const patientId = fixtureUuid("postOpCare", 2);

		try {
			await purgeFixtureOrganizations([orgId]);
			await withFixtureTenant(orgId, async () => {
				await db.insert(organizations).values({
					id: orgId,
					name: "PostOp Clinic",
				});
				await db.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Пост-Операционный Пациент",
					phone: "+79991112233",
					birthDate: "1990-01-01",
				});

				const result = await triggerPostOpCare(orgId, patientId, "Сложное удаление");
				assert.strictEqual(result.ok, true);
				if (result.ok) {
					assert.ok(result.outboxId);
					assert.strictEqual(result.duplicate, false);
				}
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});


