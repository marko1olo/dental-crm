import { closeSync, openSync, readSync, statSync } from "node:fs";
import { listDicomCandidateFiles } from "./dicomFileIoAndSafety.js";
import {
	cleanDicomText,
	formatDicomDateToIso,
	parseDicomInt,
	parseDicomPixelSpacing,
	readDicomDsFloatTrimmed,
	walkDicomTags,
} from "./dicomTagCoreReader.js";

export interface ParsedDicomMetadata {
	patientName: string | null;
	patientId: string | null;
	patientBirthDate: string | null;
	patientSex: string | null;
	studyDate: string | null;
	studyTime: string | null;
	modality: string | null;
	manufacturer: string | null;
	manufacturerModelName: string | null;
	studyDescription: string | null;
	seriesDescription: string | null;
	studyInstanceUid: string | null;
	seriesInstanceUid: string | null;
	sopInstanceUid: string | null;
	instanceNumber: number | null;
	rows: number | null;
	columns: number | null;
	bitsAllocated: number | null;
	bitsStored: number | null;
	sliceThickness: number | null;
	spacingBetweenSlices: number | null;
	pixelSpacing: [number, number] | null;
	transferSyntaxUid: string | null;
	fileSizeBytes: number;
	warnings: string[];
}

export interface DicomSeriesScanSummary {
	folderPath: string;
	studyInstanceUid: string | null;
	seriesInstanceUid: string | null;
	patientName: string | null;
	patientId: string | null;
	patientBirthDate: string | null;
	modality: string;
	manufacturer: string | null;
	studyDate: string | null;
	seriesDescription: string | null;
	sliceCount: number;
	sliceThickness: number | null;
	dimensions: string | null;
	voxelSpacing: string | null;
	totalSizeBytes: number;
	sampleFilePath: string;
	dicomFilePaths: string[];
}

const DICOM_MAX_HEADER_READ_BYTES = 512 * 1024;

function createEmptyParsedMetadata(
	fileSizeBytes: number,
	warnings: string[],
): ParsedDicomMetadata {
	return {
		patientName: null,
		patientId: null,
		patientBirthDate: null,
		patientSex: null,
		studyDate: null,
		studyTime: null,
		modality: null,
		manufacturer: null,
		manufacturerModelName: null,
		studyDescription: null,
		seriesDescription: null,
		studyInstanceUid: null,
		seriesInstanceUid: null,
		sopInstanceUid: null,
		instanceNumber: null,
		rows: null,
		columns: null,
		bitsAllocated: null,
		bitsStored: null,
		sliceThickness: null,
		spacingBetweenSlices: null,
		pixelSpacing: null,
		transferSyntaxUid: null,
		fileSizeBytes,
		warnings,
	};
}

export function parseDicomFile(filePath: string): ParsedDicomMetadata {
	const warnings: string[] = [];
	let fileSize = 0;

	try {
		fileSize = statSync(filePath).size;
	} catch (e) {
		return createEmptyParsedMetadata(fileSize, [
			`Не удалось прочитать файл: ${String(e)}`,
		]);
	}

	const bytesToRead = Math.min(fileSize, DICOM_MAX_HEADER_READ_BYTES);
	if (bytesToRead < 132) {
		return createEmptyParsedMetadata(fileSize, [
			"Файл слишком мал для формата DICOM",
		]);
	}

	const buffer = Buffer.alloc(bytesToRead);
	let bytesRead = 0;
	try {
		const fd = openSync(filePath, "r");
		try {
			bytesRead = readSync(fd, buffer, 0, bytesToRead, 0);
		} finally {
			closeSync(fd);
		}
	} catch (e) {
		return createEmptyParsedMetadata(fileSize, [
			`Ошибка чтения: ${String(e)}`,
		]);
	}

	const metadata = createEmptyParsedMetadata(fileSize, warnings);
	walkDicomTags(
		buffer.subarray(0, bytesRead),
		{
			maxIterations: 100_000,
			onIndefiniteLength: "skip_sequence",
			onTransferSyntax: ({ transferSyntaxUid }) => {
				metadata.transferSyntaxUid = transferSyntaxUid;
			},
		},
		({ tagKey, value, bigEndian }) => {
			const tagHex = tagKey.toLowerCase();
			switch (tagHex) {
				case "00100010":
					metadata.patientName = cleanDicomText(value);
					break;
				case "00100020":
					metadata.patientId = cleanDicomText(value);
					break;
				case "00100030":
					metadata.patientBirthDate = formatDicomDateToIso(cleanDicomText(value));
					break;
				case "00100040":
					metadata.patientSex = cleanDicomText(value);
					break;
				case "00080020":
					metadata.studyDate = formatDicomDateToIso(cleanDicomText(value));
					break;
				case "00080030":
					metadata.studyTime = cleanDicomText(value);
					break;
				case "00080060":
					metadata.modality = cleanDicomText(value)?.toUpperCase() ?? null;
					break;
				case "00080070":
					metadata.manufacturer = cleanDicomText(value);
					break;
				case "00081090":
					metadata.manufacturerModelName = cleanDicomText(value);
					break;
				case "00081030":
					metadata.studyDescription = cleanDicomText(value);
					break;
				case "0008103e":
					metadata.seriesDescription = cleanDicomText(value);
					break;
				case "0020000d":
					metadata.studyInstanceUid = cleanDicomText(value);
					break;
				case "0020000e":
					metadata.seriesInstanceUid = cleanDicomText(value);
					break;
				case "00080018":
					metadata.sopInstanceUid = cleanDicomText(value);
					break;
				case "00200013":
					metadata.instanceNumber = parseDicomInt(value, bigEndian);
					break;
				case "00280010":
					metadata.rows = parseDicomInt(value, bigEndian);
					break;
				case "00280011":
					metadata.columns = parseDicomInt(value, bigEndian);
					break;
				case "00280100":
					metadata.bitsAllocated = parseDicomInt(value, bigEndian);
					break;
				case "00280101":
					metadata.bitsStored = parseDicomInt(value, bigEndian);
					break;
				case "00180050":
					metadata.sliceThickness = readDicomDsFloatTrimmed(value);
					break;
				case "00180088":
					metadata.spacingBetweenSlices = readDicomDsFloatTrimmed(value);
					break;
				case "00280030": {
					const spacing = parseDicomPixelSpacing(value);
					if (spacing) metadata.pixelSpacing = spacing;
					break;
				}
			}
		},
	);

	return metadata;
}

export async function scanDicomSeriesFolder(
	folderPath: string,
): Promise<DicomSeriesScanSummary | null> {
	const dicomFiles = await listDicomCandidateFiles(folderPath);
	if (!dicomFiles || dicomFiles.length === 0) {
		return null;
	}

	const sample = dicomFiles[0];
	if (!sample) return null;
	const firstMetadata = parseDicomFile(sample.filePath);

	let totalSize = 0;
	for (const f of dicomFiles) {
		totalSize += f.size;
	}

	const dimensions =
		firstMetadata.rows && firstMetadata.columns
			? `${firstMetadata.columns}x${firstMetadata.rows}`
			: null;

	let voxelSpacing: string | null = null;
	if (
		firstMetadata.pixelSpacing &&
		(firstMetadata.sliceThickness || firstMetadata.spacingBetweenSlices)
	) {
		const z =
			firstMetadata.spacingBetweenSlices ?? firstMetadata.sliceThickness ?? 0;
		voxelSpacing = `${firstMetadata.pixelSpacing[0].toFixed(2)}x${firstMetadata.pixelSpacing[1].toFixed(2)}x${z.toFixed(2)} мм`;
	}

	return {
		folderPath,
		studyInstanceUid: firstMetadata.studyInstanceUid,
		seriesInstanceUid: firstMetadata.seriesInstanceUid,
		patientName: firstMetadata.patientName,
		patientId: firstMetadata.patientId,
		patientBirthDate: firstMetadata.patientBirthDate,
		modality: firstMetadata.modality || (dicomFiles.length > 30 ? "CBCT" : "DX"),
		manufacturer:
			firstMetadata.manufacturer || firstMetadata.manufacturerModelName,
		studyDate: firstMetadata.studyDate,
		seriesDescription:
			firstMetadata.seriesDescription || firstMetadata.studyDescription,
		sliceCount: dicomFiles.length,
		sliceThickness: firstMetadata.sliceThickness,
		dimensions,
		voxelSpacing,
		totalSizeBytes: totalSize,
		sampleFilePath: sample.filePath,
		dicomFilePaths: dicomFiles.map((f) => f.filePath),
	};
}
