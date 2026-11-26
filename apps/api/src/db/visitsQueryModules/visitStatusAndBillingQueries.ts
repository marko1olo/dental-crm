import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import { type TenantDb, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import { projectVisitRow } from "../visitsProjection.js";

export async function getVisitsForQualityControlInDb(
	organizationId: string,
	tx?: typeof db | TenantDb,
) {
	const run = async (executor: typeof db | TenantDb) => {
		const res = await executor
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
	};

	if (tx && tx !== db) {
		return run(tx);
	}
	return withTenantCtx(organizationId, run);
}

export async function updateVisitQualityControlStatusInDb(
	organizationId: string,
	visitId: string,
	qualityControlStatus: string,
	tx?: typeof db | TenantDb,
) {
	const run = async (executor: typeof db | TenantDb) => {
		const [updated] = await executor
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
	};

	if (tx && tx !== db) {
		return run(tx);
	}
	return withTenantCtx(organizationId, run);
}
