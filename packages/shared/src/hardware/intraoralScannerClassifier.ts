/**
 * @dental/shared/hardware - Universal Intraoral Scanner File Classifier & Session Grouper.
 *
 * Implements high-performance deterministic heuristics for classifying 3D scan files,
 * extracting FDI tooth numbers, detecting scanner vendor, and grouping files into
 * clinical IntraoralScanSession instances.
 *
 * Invariants: Zero Any, Pure Functional Parsing, Strict Guard Clauses, Full Internationalization (RU/EN/Translit).
 */

import type {
	IntraoralScanFileRole,
	IntraoralScanSession,
	IntraoralScannerVendor,
	Matrix4x4,
	ScannedFileInfo,
} from "./intraoralScannerTypes.js";
import { isValidFdiToothNumber } from "../clinical/dentalFormulaFdi.js";

// ============================================================================
// 1. CANONICAL REGEX PATTERNS FOR FILE ROLES
// ============================================================================

// Priority order for classification (order matters for specificity)
const SCANBODY_REGEX = /(scanbody|scan_body|трансфер|маркер|сканбоди|scan_post|scanpost|locat)/i;
const PRE_OP_REGEX = /(preop|pre_op|до_обточки|исходн|pre-op|pre_operation|study|waxup)/i;
const PREPARATION_DIE_REGEX = /(prep|stump|die|культя|уступ|преп|prepar|prepped|abutment)/i;
const BUCCAL_BITE_REGEX = /(buccal|bite|occlus|prikus|прикус|окклюз|biss|articulat|intercusp)/i;
const FACE_SCAN_REGEX = /(face|portrait|лицо|фас|facial)/i;
const UPPER_JAW_REGEX = /(upper|maxilla|maxillary|verk+h|вч|верхн|u[ _-]?jaw|maxillaire|oberkiefer|arcata_sup|^[uв]_|[\W_]u[\W_])/i;
const LOWER_JAW_REGEX = /(lower|mandible|mandibular|niz|нч|нижн|l[ _-]?jaw|mandibulaire|unterkiefer|arcata_inf|^[lн]_|[\W_]l[\W_])/i;
const PREVIEW_SCREENSHOT_REGEX = /(preview|snapshot|thumb|screen|screenshot|\.(?:png|jpe?g|bmp|webp))$/i;
const METADATA_ORDER_REGEX = /(order|meta|info|case|project|patient|\.(?:json|xml|3ox|3px|pts|txt))$/i;

// ============================================================================
// 2. VENDOR SIGNATURE PATTERNS
// ============================================================================

const VENDOR_PATTERNS: ReadonlyArray<readonly [IntraoralScannerVendor, RegExp]> = [
	["3shape", /(3shape|trios|dentaldesktop|dental_desktop|\.3ox|\.3px)/i],
	["medit", /(medit|meditlink|medit_link|i500|i700|i900)/i],
	["itero", /(itero|cadent|aligntech)/i],
	["sirona", /(sirona|sidexis|cerec|inlab|\.dxx)/i],
	["shining3d", /(shining3d|shining|aoralscan)/i],
	["panda", /(panda|bamboo|pandascan)/i],
	["runyes", /(runyes|3ds|quickscan)/i],
	["carestream", /(carestream|cs3600|cs3700|cs3800|cs_scanner)/i],
	["eighteeth", /(eighteeth|helios)/i],
];

// ============================================================================
// 3. FDI TOOTH NUMBER PARSING
// ============================================================================

/**
 * Validates whether an integer is a valid FDI two-digit tooth code (11-48, 51-85).
 */
export const isValidScanFdiToothNumber = isValidFdiToothNumber;

/**
 * Extracts candidate FDI tooth numbers from a filename or path segment.
 */
export function extractFdiToothFromFilename(fileName: string): number | undefined {
	const normalized = fileName.toLowerCase();

	// Match patterns like "tooth_16", "prep-21", "stump_36", "fdi_47", "зуб_11"
	const taggedMatch = normalized.match(/(?:tooth|t|prep|die|stump|зуб|сканбоди|fdi)[ _-]?([1-8][1-8])/);
	if (taggedMatch?.[1]) {
		const parsed = Number.parseInt(taggedMatch[1], 10);
		if (isValidScanFdiToothNumber(parsed)) {
			return parsed;
		}
	}

	// Match stand-alone two-digit numbers bordered by non-word or underscore
	const isolatedMatches = normalized.matchAll(/(?:^|[\W_])([1-8][1-8])(?:[\W_]|$)/g);
	for (const match of isolatedMatches) {
		const candidate = match[1];
		if (candidate) {
			const parsed = Number.parseInt(candidate, 10);
			if (isValidScanFdiToothNumber(parsed)) {
				return parsed;
			}
		}
	}

	return undefined;
}

// ============================================================================
// 4. VENDOR DETECTION
// ============================================================================

/**
 * Detects the intraoral scanner hardware vendor from file name, folder path, or metadata.
 */
export function detectScannerVendor(filePathOrName: string): IntraoralScannerVendor {
	for (const [vendor, regex] of VENDOR_PATTERNS) {
		if (regex.test(filePathOrName)) {
			return vendor;
		}
	}
	return "generic";
}

// ============================================================================
// 5. FILE EXTENSION & MIME HELPERS
// ============================================================================

function extractFileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1 || lastDot === fileName.length - 1) {
		return "";
	}
	return fileName.slice(lastDot + 1).toLowerCase();
}

function resolveMimeType(extension: string): string {
	switch (extension) {
		case "stl":
			return "model/stl";
		case "ply":
			return "model/ply";
		case "obj":
			return "model/obj";
		case "json":
			return "application/json";
		case "xml":
			return "application/xml";
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		default:
			return "application/octet-stream";
	}
}

// ============================================================================
// 6. SINGLE FILE CLASSIFIER
// ============================================================================

/**
 * Classifies a single 3D scan or metadata file into its clinical role.
 */
export function classifyScanFile(
	fileName: string,
	vendorHint?: IntraoralScannerVendor,
): ScannedFileInfo {
	const extension = extractFileExtension(fileName);
	const mimeType = resolveMimeType(extension);
	const detectedVendor = vendorHint ?? detectScannerVendor(fileName);
	const toothFdi = extractFdiToothFromFilename(fileName);

	// Classification cascade by strict clinical priority
	let role: IntraoralScanFileRole = "order_metadata";
	let confidence = 0.5;
	let jaw: "upper" | "lower" | "both" | undefined;

	if (PREVIEW_SCREENSHOT_REGEX.test(fileName)) {
		role = "screenshot_preview";
		confidence = 0.95;
	} else if (SCANBODY_REGEX.test(fileName)) {
		role = "scanbody";
		confidence = 0.95;
		if (UPPER_JAW_REGEX.test(fileName)) jaw = "upper";
		else if (LOWER_JAW_REGEX.test(fileName)) jaw = "lower";
	} else if (PREPARATION_DIE_REGEX.test(fileName)) {
		role = "preparation_die";
		confidence = 0.95;
		if (UPPER_JAW_REGEX.test(fileName)) jaw = "upper";
		else if (LOWER_JAW_REGEX.test(fileName)) jaw = "lower";
	} else if (PRE_OP_REGEX.test(fileName)) {
		role = "pre_op_jaw";
		confidence = 0.9;
		if (UPPER_JAW_REGEX.test(fileName)) jaw = "upper";
		else if (LOWER_JAW_REGEX.test(fileName)) jaw = "lower";
	} else if (FACE_SCAN_REGEX.test(fileName)) {
		role = "face_scan";
		confidence = 0.95;
		jaw = "both";
	} else if (BUCCAL_BITE_REGEX.test(fileName)) {
		// Differentiate bite 1 vs bite 2 (left/right or bite 1/2)
		if (/(?:bite[ _-]?2|bite2|right|правый|2)/i.test(fileName)) {
			role = "buccal_bite_2";
		} else {
			role = "buccal_bite_1";
		}
		confidence = 0.95;
		jaw = "both";
	} else if (UPPER_JAW_REGEX.test(fileName)) {
		role = "upper_jaw";
		confidence = 0.95;
		jaw = "upper";
	} else if (LOWER_JAW_REGEX.test(fileName)) {
		role = "lower_jaw";
		confidence = 0.95;
		jaw = "lower";
	} else if (METADATA_ORDER_REGEX.test(fileName)) {
		role = "order_metadata";
		confidence = 0.9;
	} else if (extension === "stl" || extension === "ply" || extension === "obj") {
		// Mesh without explicit keywords: check vendor-specific naming conventions
		if (detectedVendor === "runyes") {
			if (/_u\.stl$/i.test(fileName)) {
				role = "upper_jaw";
				jaw = "upper";
				confidence = 0.9;
			} else if (/_l\.stl$/i.test(fileName)) {
				role = "lower_jaw";
				jaw = "lower";
				confidence = 0.9;
			} else if (/_b\.stl$/i.test(fileName)) {
				role = "buccal_bite_1";
				jaw = "both";
				confidence = 0.9;
			}
		} else if (detectedVendor === "panda") {
			if (/max/i.test(fileName)) {
				role = "upper_jaw";
				jaw = "upper";
				confidence = 0.85;
			} else if (/man/i.test(fileName)) {
				role = "lower_jaw";
				jaw = "lower";
				confidence = 0.85;
			}
		}
	}

	return {
		fileName,
		role,
		fileExtension: extension,
		mimeType,
		confidence,
		vendorHint: detectedVendor,
		toothFdi,
		jaw,
	};
}

// ============================================================================
// 7. SESSION GROUPING OPTIONS & ALGORITHM
// ============================================================================

export interface ScanSessionGroupingOptions {
	readonly defaultPatientId?: string;
	readonly defaultVisitId?: string;
	readonly fallbackVendor?: IntraoralScannerVendor;
}

const IDENTITY_MATRIX_4X4: Matrix4x4 = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

/**
 * Extracts a base grouping key from a filename (removes role suffixes and extensions).
 */
function extractSessionGroupKey(fileName: string): string {
	// Normalize slashes
	const cleanPath = fileName.replace(/\\/g, "/");
	const parts = cleanPath.split("/");
	const baseName = parts[parts.length - 1] ?? fileName;

	// Strip extension
	let stripped = baseName.replace(/\.[a-z0-9]+$/i, "");

	// Repeatedly strip known scan role tokens, tooth numbers, and separators from the end
	let prev = "";
	while (prev !== stripped) {
		prev = stripped;
		stripped = stripped.replace(
			/[_-]?(?:upper(?:[_-]?jaw)?|lower(?:[_-]?jaw)?|maxilla(?:ry)?|mandib(?:le|ular)?|bite\d*|buccal(?:\d|bite\d*)?|prep(?:aration)?|stump|die|scanbody|scan[_-]?post|preop|pre[_-]?op|face(?:[_-]?scan)?|order|meta(?:data)?|case|project|preview|snapshot|thumb(?:nail)?|\d{1,2})$/i,
			"",
		);
	}

	// If inside a folder, prefix folder name to avoid collision
	if (parts.length > 1) {
		const folderName = parts[parts.length - 2];
		return `${folderName}__${stripped || "session"}`;
	}

	return stripped || "default_session";
}

/**
 * Groups an arbitrary list of scanned files into structured clinical IntraoralScanSession instances.
 */
export function groupFilesIntoScanSessions(
	rawFiles: readonly (string | ScannedFileInfo)[],
	options?: ScanSessionGroupingOptions,
): IntraoralScanSession[] {
	if (rawFiles.length === 0) {
		return [];
	}

	// 1. Normalize all inputs to ScannedFileInfo
	const classifiedFiles: ScannedFileInfo[] = rawFiles.map((f) => {
		if (typeof f === "string") {
			return classifyScanFile(f, options?.fallbackVendor);
		}
		return f;
	});

	// 2. Partition by session group key
	const groups = new Map<string, ScannedFileInfo[]>();
	for (const file of classifiedFiles) {
		const key = extractSessionGroupKey(file.fileName);
		const existing = groups.get(key);
		if (existing) {
			existing.push(file);
		} else {
			groups.set(key, [file]);
		}
	}

	// 3. Assemble each group into an IntraoralScanSession
	const sessions: IntraoralScanSession[] = [];
	let sessionIndex = 1;

	for (const [groupKey, filesInGroup] of groups.entries()) {
		// Detect dominant vendor for this session
		let dominantVendor: IntraoralScannerVendor = options?.fallbackVendor ?? "generic";
		for (const f of filesInGroup) {
			if (f.vendorHint && f.vendorHint !== "generic") {
				dominantVendor = f.vendorHint;
				break;
			}
		}

		// Identify jaw files
		const upperFile = filesInGroup.find((f) => f.role === "upper_jaw");
		const lowerFile = filesInGroup.find((f) => f.role === "lower_jaw");
		const preOpFile = filesInGroup.find((f) => f.role === "pre_op_jaw");
		const biteFiles = filesInGroup.filter(
			(f) => f.role === "buccal_bite_1" || f.role === "buccal_bite_2",
		);
		const dieFiles = filesInGroup.filter((f) => f.role === "preparation_die");
		const scanbodyFiles = filesInGroup.filter((f) => f.role === "scanbody");

		// Extract planned teeth and preparations
		const preparationTeethFdi: number[] = [];
		const implantTeethFdi: number[] = [];

		for (const f of dieFiles) {
			if (f.toothFdi !== undefined && !preparationTeethFdi.includes(f.toothFdi)) {
				preparationTeethFdi.push(f.toothFdi);
			}
		}

		for (const f of scanbodyFiles) {
			if (f.toothFdi !== undefined && !implantTeethFdi.includes(f.toothFdi)) {
				implantTeethFdi.push(f.toothFdi);
			}
		}

		// Pre-aligned occlusion flag heuristic:
		// 3Shape, Medit, iTero export meshes already in common occlusal alignment.
		// If separate upper and lower exist without vendor-aligned frame or only bite exists, flag is false.
		const isPreAligned =
			(dominantVendor === "3shape" ||
				dominantVendor === "medit" ||
				dominantVendor === "itero" ||
				dominantVendor === "shining3d") &&
			Boolean(upperFile && lowerFile);

		// Build structured LOD representations
		const session: IntraoralScanSession = {
			id: `scan-session-${groupKey}-${sessionIndex++}`,
			patientId: options?.defaultPatientId ?? `pat-${groupKey}`,
			visitId: options?.defaultVisitId,
			vendor: dominantVendor,
			scannerModel: dominantVendor !== "generic" ? `${dominantVendor.toUpperCase()} Scanner` : undefined,
			sessionDate: new Date().toISOString(),
			occlusionMatrix: IDENTITY_MATRIX_4X4,
			isOcclusionPreAligned: isPreAligned,
			preparationTeethFdi: preparationTeethFdi.sort((a, b) => a - b),
			implantTeethFdi: implantTeethFdi.sort((a, b) => a - b),
			materialsPlanned: {},
			upperJawLods: upperFile
				? {
						lod0MasterUrl: upperFile.url ?? upperFile.fileName,
					}
				: undefined,
			lowerJawLods: lowerFile
				? {
						lod0MasterUrl: lowerFile.url ?? lowerFile.fileName,
					}
				: undefined,
			buccalBiteLods:
				biteFiles.length > 0
					? biteFiles.map((b) => ({ lod0MasterUrl: b.url ?? b.fileName }))
					: undefined,
			preparationLods:
				dieFiles.length > 0
					? dieFiles
							.filter((d) => d.toothFdi !== undefined)
							.map((d) => ({
								toothFdi: d.toothFdi as number,
								lod0MasterUrl: d.url ?? d.fileName,
							}))
					: undefined,
			scanbodyLods:
				scanbodyFiles.length > 0
					? scanbodyFiles
							.filter((s) => s.toothFdi !== undefined)
							.map((s) => ({
								toothFdi: s.toothFdi as number,
								lod0MasterUrl: s.url ?? s.fileName,
							}))
					: undefined,
			preOpJawLods: preOpFile
				? {
						lod0MasterUrl: preOpFile.url ?? preOpFile.fileName,
					}
				: undefined,
			files: filesInGroup,
			metadata: {
				groupKey,
				fileCount: filesInGroup.length,
			},
		};

		sessions.push(session);
	}

	return sessions;
}
