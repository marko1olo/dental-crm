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
		doseMsv: kind === "opg" ? 0.025 : 0.002,
		effectiveDoseMsv: kind === "opg" ? 0.025 : 0.002,
		previewUrl: record.storagePath
			? (browserRenderableImageMimeType(record.storagePath)
				? `/api/imaging/studies/${record.id}/file`
				: `/api/imaging/studies/${record.id}/preview.svg`)
			: (record.fileUrl ? `${record.fileUrl}/${record.id}` : `/api/imaging/studies/${record.id}/preview.svg`),
		viewerUrl: record.storagePath
			? `/api/imaging/studies/${record.id}/file`
			: (record.fileUrl ? `${record.fileUrl}/${record.id}` : `/api/imaging/studies/${record.id}/preview.svg`),
	};
}
