import type { ImagingStudy } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";

export { createImagingStudiesInDb } from "./imagingStudyBatchMutations.js";

export async function createImagingStudyInDb(
	organizationId: string,
	input: {
		patientId: string;
		visitId?: string | null | undefined;
		doctorId?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: domain schema contract
		kind: any;
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: domain schema contract
		sourceKind: any;
		sourceName: string;
		storagePath?: string | null | undefined;
		dicomStudyUid?: string | null | undefined;
		capturedAt?: string | null | undefined;
		aiSummary?: string | null | undefined;
	},
): Promise<ImagingStudy> {
	const [ownedPatient] = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, input.patientId)))
		.limit(1);
	if (!ownedPatient) {
		throw new Error("Пациент не принадлежит организации: создание снимка отклонено");
	}
	if (input.visitId) {
		const [ownedVisit] = await db
			.select({ id: schema.visits.id })
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.patientId, input.patientId),
				),
			)
			.limit(1);
		if (!ownedVisit) {
			throw new Error("Приём не принадлежит организации или пациенту: создание снимка отклонено");
		}
	}
	const [record] = await db
		.insert(schema.imagingStudies)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			doctorId: input.doctorId || null,
			kind: input.kind,
			title: input.title.length > 180 ? input.title.slice(0, 180) : input.title,
			toothCode: input.toothCode || null,
			region: input.region || null,
			capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
			sourceKind: input.sourceKind,
			sourceName: input.sourceName.length > 160 ? input.sourceName.slice(0, 160) : input.sourceName,
			storagePath: input.storagePath || null,
			dicomStudyUid: input.dicomStudyUid || null,
			status: "needs_review",
			aiSummary: input.aiSummary || null,
		})
		.returning();

	if (!record) throw new Error("Не удалось создать запись исследования");
	return mapImagingStudy(record);
}
