import type { ImagingStudy } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";

export async function createImagingStudiesInDb(
	organizationId: string,
	inputs: Array<{
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
	}>,
): Promise<ImagingStudy[]> {
	if (inputs.length === 0) return [];
	const patientIds = Array.from(new Set(inputs.map((i) => i.patientId)));

	const ownedPatients = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				inArray(schema.patients.id, patientIds),
			),
		);

	if (ownedPatients.length !== patientIds.length) {
		throw new Error("Не все пациенты принадлежат организации: создание снимка отклонено");
	}

	const records = await db
		.insert(schema.imagingStudies)
		.values(
			inputs.map((input) => ({
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
				status: "needs_review" as const,
				aiSummary: input.aiSummary || null,
			})),
		)
		.returning();

	return records.map((r) => mapImagingStudy(r));
}
