/**
 * @dental/shared/hardware - Layer 1: Hot Folder Watcher Metadata Extraction.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type { HotFolderFileMetadata } from "./types.js";
import { detectHardwareVendorFromPath } from "./presets.js";
import { matchPhotoProtocolSlot } from "./photoProtocol.js";

/**
 * Parses radiology, mesh, document or photo filename from hot folder.
 */
export function parseHotFolderFilenameMetadata(
	fileName: string,
	targetPath?: string
): HotFolderFileMetadata {
	const safeName = fileName || "";
	const combinedPath = targetPath ? `${targetPath}/${safeName}` : safeName;
	const vendor = detectHardwareVendorFromPath(combinedPath);

	let toothCode: string | undefined;
	let patientId: string | undefined;

	// FDI notation: permanent (11..48) or primary/pediatric (51..85)
	const matchTooth = safeName.match(
		/(?:tooth[_-]?|зуб[_-]?|_|-)([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])(?:\b|_|-|\.|$)/i
	);
	if (matchTooth) {
		toothCode = matchTooth[1];
	}

	// Patient ID extraction: patient_123, pat-123, pid-123, p-123, id_123, chart_123
	const matchPatient = safeName.match(
		/(?:^|[_\W])(?:patient[_-]?|пациент[_-]?|pat[_-]?|pid[_-]?|p[_-]|id[_-]|chart[_-]?)([A-Za-z0-9]+)(?=[_\W]|$)/i
	);
	if (matchPatient) {
		patientId = matchPatient[1];
	}

	const ext = safeName.includes(".") ? `.${safeName.split(".").pop()!.toLowerCase()}` : "";
	const isDicom = [".dcm", ".dicom", ".ima"].includes(ext);
	const isMesh = [".stl", ".ply", ".obj"].includes(ext);
	const isDoc = [".pdf", ".tif", ".tiff"].includes(ext);
	const isImage = [".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(ext);

	const photoProtocolSlot = matchPhotoProtocolSlot(safeName);

	let fileCategory: HotFolderFileMetadata["fileCategory"] = "standard_image";
	let modality: HotFolderFileMetadata["modality"] = "IO";

	const lowerName = safeName.toLowerCase();
	const isCbct = lowerName.includes("cbct") || lowerName.includes("ct") || lowerName.includes("3d") || lowerName.includes("tomography");
	const isPan = lowerName.includes("pan") || lowerName.includes("opg") || lowerName.includes("pax") || lowerName.includes("orthophos");

	if (isDicom) {
		fileCategory = "dicom";
		modality = isCbct ? "CT" : isPan ? "PX" : "IO";
	} else if (isMesh) {
		fileCategory = "mesh";
		modality = "3D_SCAN";
	} else if (isDoc) {
		fileCategory = "document";
		modality = "DOC";
	} else if (photoProtocolSlot || lowerName.includes("dcim") || lowerName.includes("photo") || lowerName.includes("портрет") || lowerName.includes("улыбка")) {
		fileCategory = "photo";
		modality = "PHOTO";
	} else if (isImage) {
		fileCategory = "standard_image";
		modality = toothCode ? "IO" : isCbct ? "CT" : isPan ? "PX" : "DX";
	}

	return {
		fileName: safeName,
		fullPath: targetPath ? targetPath : undefined,
		toothCode,
		patientId,
		vendor,
		modality,
		fileCategory,
		photoProtocolSlot,
	};
}

/**
 * Backward-compatible helper for DICOM filename parsing.
 */
export function parseDicomFilenameMetadata(fileName: string): { toothCode?: string; patientId?: string } {
	const res = parseHotFolderFilenameMetadata(fileName);
	const out: { toothCode?: string; patientId?: string } = {};
	if (res.toothCode !== undefined) out.toothCode = res.toothCode;
	if (res.patientId !== undefined) out.patientId = res.patientId;
	return out;
}
