import type { ImagingStudy } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";
import { normalizeDbImagingSourceKind } from "./imagingStudyMutations.js";

export async function createImagingStudiesInDb(
	organizationId: string,
	inputs: Array<{
		patientId: string;
		visitId?: string | null | undefined;
		doctorId?: string | null | undefined;
		kind: ImagingStudy["kind"];
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
		sourceKind: ImagingStudy["sourceKind"];
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

	const visitIds = Array.from(new Set(inputs.map((i) => i.visitId).filter((v): v is string => Boolean(v))));
	if (visitIds.length > 0) {
		const ownedVisits = await db
			.select({ id: schema.visits.id, patientId: schema.visits.patientId })
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					inArray(schema.visits.id, visitIds),
				),
			);
		if (ownedVisits.length !== visitIds.length) {
			throw new Error("Не все приёмы принадлежат организации: создание снимка отклонено");
		}
		const visitPatientMap = new Map(ownedVisits.map((v) => [v.id, v.patientId]));
		for (const input of inputs) {
			if (input.visitId) {
				const expectedPatient = visitPatientMap.get(input.visitId);
				if (expectedPatient !== input.patientId) {
					throw new Error("Приём не принадлежит указанному пациенту: создание снимка отклонено");
				}
			}
		}
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
				sourceKind: normalizeDbImagingSourceKind(input.sourceKind),
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
