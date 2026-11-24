import type { ImagingStudy } from "@dental/shared";
import { browserRenderableImageMimeType } from "../../imaging/previewFormats.js";
import * as schema from "../schema.js";

export function mapXrayScanToImagingStudy(
	record: typeof schema.xrayScans.$inferSelect,
	patientFullName?: string | null,
): ImagingStudy {
	const kind = (record.kind === "bitewing"
		? "bitewing"
		: record.kind === "opg"
			? "opg"
			: record.kind === "other"
				? "other"
				: "periapical") as "periapical" | "bitewing" | "opg" | "other";

	const title = record.originalFilename
		? record.originalFilename
		: record.toothCode
			? `Прицельный снимок зуба ${record.toothCode}`
			: "Прицельный снимок RVG";

	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		doctorId: null,
		kind,
		title,
		toothCode: record.toothCode,
		region: record.toothCode ? `Зуб ${record.toothCode}` : null,
		capturedAt: record.capturedAt.toISOString(),
		sourceKind: "sensor_bridge",
		sourceName: "Визиограф (RVG)",
		storagePath: record.storagePath,
		dicomStudyUid: null,
		studyInstanceUid: null,
		seriesInstanceUid: null,
		modality: record.kind === "opg" ? "PX" : "IO",
		seriesDescription: record.notes ?? title,
		studyDate: record.capturedAt.toISOString().slice(0, 10).replace(/-/g, ""),
		sliceCount: 1,
		dimensions: null,
		voxelSpacing: null,
		fileSizeBytes: record.fileSizeBytes,
		bindingStatus: "manual_bound",
		bindingConfidence: 100,
		dicomPatientName: null,
		dicomPatientId: null,
		dicomBirthDate: null,
		patientFullName: patientFullName ?? null,
		status: "available",
		aiSummary: record.aiSummary,
		doseMsv: null,
		effectiveDoseMsv: null,
		previewUrl: record.storagePath
			? (browserRenderableImageMimeType(record.storagePath)
				? `/api/imaging/studies/${record.id}/file`
				: `/api/imaging/studies/${record.id}/preview.svg`)
			: (record.fileUrl ? record.fileUrl : `/api/imaging/studies/${record.id}/preview.svg`),
		viewerUrl: record.storagePath
			? `/api/imaging/studies/${record.id}/file`
			: (record.fileUrl ? record.fileUrl : `/api/imaging/studies/${record.id}/preview.svg`),
	};
}

export function mapImagingStudyToXrayScan(
	study: typeof schema.imagingStudies.$inferSelect,
): typeof schema.xrayScans.$inferSelect {
	return {
		id: study.id,
		organizationId: study.organizationId,
		patientId: study.patientId ?? "",
		visitId: study.visitId,
		imageDataUri: null,
		storagePath: study.storagePath,
		fileUrl: `/api/imaging/studies/${study.id}/file`,
		fileSizeBytes: study.fileSizeBytes,
		sha256: null,
		originalFilename: study.title,
		mimeType: "image/jpeg",
		aiReport: null,
		aiSummary: study.aiSummary,
		aiToothStates: null,
		aiModelName: null,
		aiAnalyzedAt: null,
		aiError: null,
		status: study.status === "available" ? "done" : "pending",
		kind: study.kind || "periapical",
		toothCode: study.toothCode,
		notes: study.title,
		capturedAt: study.capturedAt,
		createdAt: study.createdAt,
		updatedAt: study.createdAt,
	};
}
