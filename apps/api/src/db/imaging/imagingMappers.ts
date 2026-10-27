import type { ImagingStudy } from "@dental/shared";
import { browserRenderableImageMimeType } from "../../imaging/previewFormats.js";
import * as schema from "../schema.js";

export { mapXrayScanToImagingStudy } from "./imagingXrayMapper.js";

export function mapImagingStudy(
	record: typeof schema.imagingStudies.$inferSelect,
	patientFullNameOrOptions?:
		| string
		| null
		| { patientFullName?: string | null },
): ImagingStudy {
	const patientFullName =
		typeof patientFullNameOrOptions === "string"
			? patientFullNameOrOptions
			: typeof patientFullNameOrOptions === "object" &&
					patientFullNameOrOptions !== null
				? patientFullNameOrOptions.patientFullName ?? null
				: null;
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
		// biome-ignore lint/suspicious/noExplicitAny: domain schema contract
		bindingStatus: (record.bindingStatus as any) || "unassigned",
		bindingConfidence: record.bindingConfidence ?? 0,
		dicomPatientName: record.dicomPatientName,
		dicomPatientId: record.dicomPatientId,
		dicomBirthDate: record.dicomBirthDate,
		patientFullName: patientFullName ?? null,
		status: record.status,
		aiSummary: record.aiSummary,
		doseMsv:
			record.kind === "periapical" || record.kind === "bitewing"
				? 0.002
				: record.kind === "opg"
					? 0.025
					: record.kind === "cbct"
						? 0.05
						: record.kind === "ceph"
							? 0.01
							: null,
		effectiveDoseMsv:
			record.kind === "periapical" || record.kind === "bitewing"
				? 0.002
				: record.kind === "opg"
					? 0.025
					: record.kind === "cbct"
						? 0.05
						: record.kind === "ceph"
							? 0.01
							: null,
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
