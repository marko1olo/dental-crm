import { inferManifestFieldsFromPath, quoteManifestCell } from "../folderScanManifest.js";
import type { DicomHeaderMetadata } from "../imagingConstants.js";
import { modalityToKind } from "../manifestParser.js";

export function dicomMetadataManifestRow(
	filePath: string,
	metadata: DicomHeaderMetadata,
	sourceName: string,
): string {
	const fallback = inferManifestFieldsFromPath(filePath);
	const kind =
		modalityToKind(
			metadata.modality,
			`${metadata.studyDescription ?? ""} ${metadata.seriesDescription ?? ""}`,
		) ??
		fallback.kind ??
		null;
	return [
		metadata.patientName ?? fallback.patientName,
		kind,
		metadata.modality,
		metadata.studyInstanceUid,
		metadata.seriesInstanceUid,
		metadata.sopInstanceUid,
		metadata.studyDescription,
		metadata.seriesDescription,
		metadata.instanceNumber === null ? null : String(metadata.instanceNumber),
		metadata.imageRows === null ? null : String(metadata.imageRows),
		metadata.imageColumns === null ? null : String(metadata.imageColumns),
		metadata.bitsAllocated === null ? null : String(metadata.bitsAllocated),
		metadata.samplesPerPixel === null ? null : String(metadata.samplesPerPixel),
		metadata.estimatedPixelBytes === null
			? null
			: String(metadata.estimatedPixelBytes),
		metadata.capturedAt ?? fallback.date,
		filePath,
		sourceName,
	]
		.map(quoteManifestCell)
		.join(";");
}

export function dicomMetadataManifestHeader(): string {
	return [
		"patient",
		"kind",
		"modality",
		"StudyInstanceUID",
		"SeriesInstanceUID",
		"SOPInstanceUID",
		"StudyDescription",
		"SeriesDescription",
		"InstanceNumber",
		"Rows",
		"Columns",
		"BitDepth",
		"SamplesPerPixel",
		"EstimatedPixelBytes",
		"date",
		"file",
		"source",
	].join(";");
}
