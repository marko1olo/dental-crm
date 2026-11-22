import type { ImagingStudy, ImagingStudyBindingStatus } from "@dental/shared";
import { browserRenderableImageMimeType } from "../../imaging/previewFormats.js";
import * as schema from "../schema.js";

export { mapXrayScanToImagingStudy } from "./imagingXrayMapper.js";

export function mapImagingStudy(
	record: typeof schema.imagingStudies.$inferSelect,
	patientFullNameOrOptions?:
		| string
		| null
		| {
				patientFullName?: string | null | undefined;
				doseMsv?: number | null | undefined;
				effectiveDoseMsv?: number | null | undefined;
		  },
): ImagingStudy {
	const options =
		typeof patientFullNameOrOptions === "object" &&
		patientFullNameOrOptions !== null
			? patientFullNameOrOptions
			: null;
	const patientFullName =
		typeof patientFullNameOrOptions === "string"
			? patientFullNameOrOptions
			: options?.patientFullName ?? null;

	const rawRecord = record as {
		doseMsv?: number | null | undefined;
		effectiveDoseMsv?: number | null | undefined;
	};
	const doseMsv = options?.doseMsv ?? rawRecord.doseMsv ?? null;
	const effectiveDoseMsv =
		options?.effectiveDoseMsv ?? rawRecord.effectiveDoseMsv ?? doseMsv ?? null;

	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		doctorId: record.doctorId,
		kind: record.kind,
		title: record.title,
		toothCode: record.toothCode,
		region: record.region,
		capturedAt: record.capturedAt.toISOString(),
		sourceKind: record.sourceKind,
		sourceName: record.sourceName,
		storagePath: record.storagePath,
		dicomStudyUid: record.dicomStudyUid,
		studyInstanceUid: record.studyInstanceUid ?? record.dicomStudyUid,
		seriesInstanceUid: record.seriesInstanceUid,
		modality: record.modality,
		seriesDescription: record.seriesDescription,
		studyDate: record.studyDate,
		sliceCount: record.sliceCount,
		dimensions: record.dimensions,
		voxelSpacing: record.voxelSpacing,
		fileSizeBytes: record.fileSizeBytes,
		bindingStatus: (record.bindingStatus as ImagingStudyBindingStatus) || "unassigned",
		bindingConfidence: record.bindingConfidence ?? 0,
		dicomPatientName: record.dicomPatientName,
		dicomPatientId: record.dicomPatientId,
		dicomBirthDate: record.dicomBirthDate,
		patientFullName: patientFullName ?? null,
		status: record.status,
		aiSummary: record.aiSummary,
		doseMsv,
		effectiveDoseMsv,
		previewUrl: record.storagePath
			? (browserRenderableImageMimeType(record.storagePath)
				? `/api/imaging/studies/${record.id}/file`
				: `/api/imaging/studies/${record.id}/preview.svg`)
			: `/api/imaging/studies/${record.id}/preview.svg`,
		viewerUrl: record.storagePath
			? `/api/imaging/studies/${record.id}/file`
			: `/api/imaging/studies/${record.id}/preview.svg`,
	};
}
