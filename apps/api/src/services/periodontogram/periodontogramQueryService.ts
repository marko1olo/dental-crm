/**
 * apps/api/src/services/periodontogram/periodontogramQueryService.ts
 *
 * Query operations for periodontogram examinations, snapshots, teeth, and sites.
 * Mandate 8b: File <= 120 lines.
 */

import { and, desc, eq } from "drizzle-orm";
import type { db } from "../../db/client.js";
import { type TenantDb, withTenantCtx } from "../../db/rls.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../../db/schema.js";
import type { SiteRow, ToothRow } from "../periodontogramIndices.js";

export function formatSnapshotTeethWithSites(
	teeth: readonly ToothRow[],
	sites: readonly SiteRow[],
) {
	const sitesByTooth = new Map<number, SiteRow[]>();
	for (const s of sites) {
		const list = sitesByTooth.get(s.toothNumber) ?? [];
		list.push(s);
		sitesByTooth.set(s.toothNumber, list);
	}

	return teeth.map((t) => ({
		...t,
		sites: sitesByTooth.get(t.toothNumber) ?? [],
	}));
}

export async function fetchSnapshotTeethAndSites(
	snapshotId: string,
	executor: TenantDb | typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) {
	const teeth = await executor
		.select()
		.from(periodontogramTeeth)
		.where(eq(periodontogramTeeth.snapshotId, snapshotId))
		.orderBy(periodontogramTeeth.toothNumber);

	const sites = await executor
		.select()
		.from(periodontogramSites)
		.where(eq(periodontogramSites.snapshotId, snapshotId))
		.orderBy(
			periodontogramSites.toothNumber,
			periodontogramSites.siteCode,
		);

	return {
		teeth,
		sites,
		formattedTeeth: formatSnapshotTeethWithSites(teeth, sites),
	};
}

/**
 * Fetches the active draft or latest closed periodontogram snapshot for a patient.
 */
export async function fetchPatientLatestPeriodontogram(
	orgId: string,
	patientId: string,
	tx?: TenantDb,
) {
	const run = async (exec: TenantDb) => {
		// 1. Check for active draft first
		const [draft] = await exec
			.select()
			.from(periodontogramSnapshots)
			.where(
				and(
					eq(periodontogramSnapshots.organizationId, orgId),
					eq(periodontogramSnapshots.patientId, patientId),
					eq(periodontogramSnapshots.status, "draft"),
				),
			)
			.limit(1);

		if (draft) {
			const { formattedTeeth } = await fetchSnapshotTeethAndSites(draft.id, exec);
			return {
				...draft,
				teeth: formattedTeeth,
			};
		}

		// 2. Fall back to latest closed examination
		const [latestClosed] = await exec
			.select()
			.from(periodontogramSnapshots)
			.where(
				and(
					eq(periodontogramSnapshots.organizationId, orgId),
					eq(periodontogramSnapshots.patientId, patientId),
					eq(periodontogramSnapshots.status, "closed"),
				),
			)
			.orderBy(desc(periodontogramSnapshots.recordedAt))
			.limit(1);

		if (latestClosed) {
			const { formattedTeeth } = await fetchSnapshotTeethAndSites(latestClosed.id, exec);
			return {
				...latestClosed,
				teeth: formattedTeeth,
			};
		}

		return null;
	};

	return tx ? run(tx) : withTenantCtx(orgId, run);
}
