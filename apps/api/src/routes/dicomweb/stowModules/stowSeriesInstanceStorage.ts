import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";

export interface StowSeriesInstanceParams {
	organizationId: string;
	studyId: string;
	seriesUid: string;
	sopInstanceUid: string;
	normalizedRelativePath: string;
	rows?: number;
	columns?: number;
}

export async function persistStowSeriesAndInstance(p: StowSeriesInstanceParams): Promise<{ seriesId: string; instanceId: string }> {
	// 1. Series
	let [series] = await db
		.select({ id: schema.imagingSeries.id })
		.from(schema.imagingSeries)
		.where(
			and(
				eq(schema.imagingSeries.organizationId, p.organizationId),
				eq(schema.imagingSeries.studyId, p.studyId),
				eq(schema.imagingSeries.dicomSeriesUid, p.seriesUid),
			),
		)
		.limit(1);

	if (!series) {
		const [createdSeries] = await db
			.insert(schema.imagingSeries)
			.values({
				organizationId: p.organizationId,
				studyId: p.studyId,
				dicomSeriesUid: p.seriesUid,
				modality: "CT",
				seriesDescription: "STOW-RS Series",
			})
			.returning({ id: schema.imagingSeries.id });
		if (!createdSeries) throw new Error("Не удалось создать запись серии");
		series = createdSeries;
	}

	// 2. Instance
	let [instance] = await db
		.select({ id: schema.imagingInstances.id })
		.from(schema.imagingInstances)
		.where(
			and(
				eq(schema.imagingInstances.organizationId, p.organizationId),
				eq(schema.imagingInstances.seriesId, series.id),
				eq(schema.imagingInstances.dicomSopInstanceUid, p.sopInstanceUid),
			),
		)
		.limit(1);

	if (!instance) {
		const [createdInstance] = await db
			.insert(schema.imagingInstances)
			.values({
				organizationId: p.organizationId,
				seriesId: series.id,
				dicomSopInstanceUid: p.sopInstanceUid,
				storagePath: p.normalizedRelativePath,
				rows: p.rows,
				columns: p.columns,
			})
			.returning({ id: schema.imagingInstances.id });
		if (!createdInstance) throw new Error("Не удалось создать запись экземпляра");
		instance = createdInstance;
	} else {
		await db
			.update(schema.imagingInstances)
			.set({
				storagePath: p.normalizedRelativePath,
				rows: p.rows,
				columns: p.columns,
			})
			.where(
				and(
					eq(schema.imagingInstances.id, instance.id),
					eq(schema.imagingInstances.organizationId, p.organizationId),
				),
			);
	}

	return { seriesId: series.id, instanceId: instance.id };
}
