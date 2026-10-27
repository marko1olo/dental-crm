import type { ImagingStudy } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";

export async function updateImagingStudyAiSummaryInDb(
	organizationId: string,
	id: string,
	summary: string,
	targetDb: typeof db = db,
): Promise<ImagingStudy> {
	const [record] = await targetDb
		.update(schema.imagingStudies)
		.set({ aiSummary: summary })
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.returning();

	if (!record) {
		throw new Error("Не удалось обновить исследование");
	}

	return mapImagingStudy(record);
}

export async function updateImagingStudyInDb(
	organizationId: string,
	id: string,
	updates: {
		visitId?: string | null | undefined;
		kind?: typeof schema.imagingStudies.$inferInsert["kind"] | undefined;
		title?: string | undefined;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		status?: typeof schema.imagingStudies.$inferInsert["status"] | undefined;
		aiSummary?: string | null | undefined;
		storagePath?: string | null | undefined;
	},
	targetDb: typeof db = db,
): Promise<ImagingStudy | null> {
	const [record] = await targetDb
		.update(schema.imagingStudies)
		.set(updates)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, id),
			),
		)
		.returning();

	return record ? mapImagingStudy(record) : null;
}
