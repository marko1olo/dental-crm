import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";

export interface StowSeriesInstanceParams {
	organizationId: string;
	studyId: string;
	seriesUid: string;
	sopInstanceUid: string;
	sopClassUid?: string | null | undefined;
	normalizedRelativePath: string;
	rows?: number | undefined;
	columns?: number | undefined;
	tx?: {
		select: typeof db.select;
		insert: typeof db.insert;
		update: typeof db.update;
	};
}

export async function persistStowSeriesAndInstance(p: StowSeriesInstanceParams): Promise<{ seriesId: string; instanceId: string }> {
	const dbClient = p.tx ?? db;
	// 1. Series
	let [series] = await dbClient
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
		const [createdSeries] = await dbClient
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
	let [instance] = await dbClient
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
		const [createdInstance] = await dbClient
			.insert(schema.imagingInstances)
			.values({
				organizationId: p.organizationId,
				seriesId: series.id,
				dicomSopInstanceUid: p.sopInstanceUid,
				sopInstanceUid: p.sopInstanceUid,
				sopClassUid: p.sopClassUid ?? "1.2.840.10008.5.1.4.1.1.1",
				storagePath: p.normalizedRelativePath,
				rows: p.rows,
				columns: p.columns,
			})
			.returning({ id: schema.imagingInstances.id });
		if (!createdInstance) throw new Error("Не удалось создать запись экземпляра");
		instance = createdInstance;
	} else {
		await dbClient
			.update(schema.imagingInstances)
			.set({
				storagePath: p.normalizedRelativePath,
				sopClassUid: p.sopClassUid ?? schema.imagingInstances.sopClassUid,
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
