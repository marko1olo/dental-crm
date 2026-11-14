import crypto from "node:crypto";
import type { ImagingStudy } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";

export { createImagingStudiesInDb } from "./imagingStudyBatchMutations.js";

export function normalizeDbImagingSourceKind(
	sourceKind: ImagingStudy["sourceKind"],
): (typeof schema.imagingStudies.$inferInsert)["sourceKind"] {
	switch (sourceKind) {
		case "hot_folder":
			return "folder_watch";
		case "dicom_worklist":
			return "dicomweb";
		default:
			return sourceKind;
	}
}

export async function createImagingStudyInDb(
	organizationId: string,
	input: {
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
		dicomSeriesUid?: string | null | undefined;
		dicomSopInstanceUid?: string | null | undefined;
		capturedAt?: string | null | undefined;
		aiSummary?: string | null | undefined;
		fileSizeBytes?: number | null | undefined;
	},
): Promise<ImagingStudy> {
	return db.transaction(async (tx) => {
		const [ownedPatient] = await tx
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, input.patientId)))
			.limit(1);
		if (!ownedPatient) {
			throw new Error("Пациент не принадлежит организации: создание снимка отклонено");
		}
		if (input.visitId) {
			const [ownedVisit] = await tx
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

		const studyUid = input.dicomStudyUid || `1.2.840.10008.study.${crypto.randomUUID()}`;
		const seriesUid = input.dicomSeriesUid || `${studyUid}.1`;
		const sopUid = input.dicomSopInstanceUid || `${seriesUid}.1`;

		const [record] = await tx
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
				sourceKind: normalizeDbImagingSourceKind(input.sourceKind),
				sourceName: input.sourceName.length > 160 ? input.sourceName.slice(0, 160) : input.sourceName,
				storagePath: input.storagePath || null,
				dicomStudyUid: studyUid,
				studyInstanceUid: studyUid,
				seriesInstanceUid: seriesUid,
				status: "needs_review",
				aiSummary: input.aiSummary || null,
			})
			.returning();

		if (!record) throw new Error("Не удалось создать запись исследования");

		// Гарантируем создание imaging_series
		const [seriesRecord] = await tx
			.insert(schema.imagingSeries)
			.values({
				organizationId,
				studyId: record.id,
				dicomSeriesUid: seriesUid,
				seriesNumber: 1,
				modality: (String(input.kind) === "cbct" || String(input.kind) === "ct") ? "CT" : ((String(input.kind) === "rvg" || input.kind === "periapical") ? "IO" : "PX"),
				seriesDescription: input.title,
			})
			.returning();

		// Гарантируем создание imaging_instances при наличии файла снимка
		if (input.storagePath && seriesRecord) {
			await tx
				.insert(schema.imagingInstances)
				.values({
					organizationId,
					seriesId: seriesRecord.id,
					dicomSopInstanceUid: sopUid,
					sopInstanceUid: sopUid,
					instanceNumber: 1,
					storagePath: input.storagePath,
					fileSizeBytes: input.fileSizeBytes ?? 0,
				});
		}

		return mapImagingStudy(record);
	});
}
