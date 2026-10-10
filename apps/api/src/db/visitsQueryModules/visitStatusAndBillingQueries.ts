import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { projectVisitRow } from "../visitsProjection.js";

export async function getVisitsForQualityControlInDb(organizationId: string) {
	const res = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.status, "signed"),
				eq(schema.visits.qualityControlStatus, "pending"),
			),
		);
	return res.map(projectVisitRow);
}

export async function updateVisitQualityControlStatusInDb(
	organizationId: string,
	visitId: string,
	qualityControlStatus: string,
) {
	const [updated] = await db
		.update(schema.visits)
		.set({ qualityControlStatus })
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, visitId),
			),
		)
		.returning();
	if (!updated) throw new Error("Визит не найден");
	return projectVisitRow(updated);
}
