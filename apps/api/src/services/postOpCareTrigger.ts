import { db } from "../db/client.js";
import { outgoingNotifications } from "../db/schema.js";

export async function triggerPostOpCare(
	orgId: string,
	patientId: string,
	itemTitle: string,
) {
	await db.insert(outgoingNotifications).values({
		organizationId: orgId,
		patientId: patientId,
		type: "PostOp_Care",
		payload: {
			patientId,
			itemTitle,
			alertMessage: `Позвонить пациенту (ID: ${patientId}) - контроль самочувствия после: ${itemTitle}`,
		},
		status: "pending",
	});
}
