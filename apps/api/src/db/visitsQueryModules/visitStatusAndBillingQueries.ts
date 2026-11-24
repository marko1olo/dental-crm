import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import type { TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import { projectVisitRow } from "../visitsProjection.js";

export async function getVisitsForQualityControlInDb(
	organizationId: string,
	tx: typeof db | TenantDb = db,
) {
	const res = await tx
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
	tx: typeof db | TenantDb = db,
) {
	const [updated] = await tx
		.update(schema.visits)
		.set({ qualityControlStatus })
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, visitId),
			),
		)
		.returning();
	if (!updated) return null;
	return projectVisitRow(updated);
}
