/**
 * apps/api/src/services/scanner/universalScannerHub.ts — Universal Intraoral Optical 3D Scanner Service Hub.
 *
 * Clinical & Ingestion Hub for all intraoral dental scanners (3Shape TRIOS, Medit,
 * iTero, Sirona, Shining 3D, Panda, Runyes, Carestream, Eighteeth, Generic).
 *
 * Invariants: Zero Any, Strict Zod/Schema Validation, Multitenant RLS isolation,
 * Path Traversal Jail, Graceful Mesh Simplification Fallback.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, ilike } from "drizzle-orm";
import {
	classifyScanFile,
	detectScannerVendor,
	extractFdiToothFromFilename,
	isValidUuid,
	type IntraoralScannerVendor,
	type Matrix4x4,
} from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { withResilientTransaction } from "../../db/resilientTransaction.js";
import { createApiLogger } from "../../observability/logger.js";
import {
	PathTraversalError,
	TenantIsolationError,
	validateAndResolvePacsLocalFilePath,
} from "../imaging/localPacsSanitizer.js";
import {
	intraoralScanSessions,
	type IntraoralScanSessionRecord,
	type NewIntraoralScanSessionRecord,
} from "../../db/schema/intraoralScans.js";
import { patients, visits } from "../../db/schema.js";
import {
	extractScanFilesFromZipAsync,
	extractScanFilesFromZipPath,
	type ScanFileInput,
} from "./scannerZipExtractor.js";
import { parseMetadataContent } from "./scannerMetadataParsers.js";
import { generateLod1Mesh } from "./scannerLodGenerator.js";

const scannerHubLogger = createApiLogger("universalScannerHub");

export {
	extractScanFilesFromZip,
	extractScanFilesFromZipAsync,
	extractScanFilesFromZipPath,
	type ScanFileInput,
} from "./scannerZipExtractor.js";
export { parseMetadataContent, type ExtractedMetadata } from "./scannerMetadataParsers.js";
export { generateLod1Mesh } from "./scannerLodGenerator.js";

// ============================================================================
// 1. TYPES & CONTRACTS
// ============================================================================

export interface ProcessScanSessionOptions {
	organizationId: string;
	patientId?: string | undefined;
	visitId?: string | undefined;
	labOrderId?: string | undefined;
	vendor?: IntraoralScannerVendor | undefined;
	scannerModel?: string | undefined;
	zipFilePath?: string | undefined;
	zipBuffer?: Buffer | undefined;
	files?: ScanFileInput[] | undefined;
	folderPath?: string | undefined;
	preparationTeethFdi?: number[] | undefined;
	implantTeethFdi?: number[] | undefined;
	materialsPlanned?: Record<string, string> | undefined;
	vitaShade?: string | undefined;
}

const DEFAULT_IDENTITY_MATRIX: Matrix4x4 = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

// ============================================================================
// 2. PATH & STORAGE CONSTANTS
// ============================================================================

export const SCANS_STORAGE_BASE_DIR = path.resolve(process.cwd(), "storage", "scans");

export function getSessionStorageDir(organizationId: string, sessionId: string): string {
	if (!isValidUuid(organizationId) || !isValidUuid(sessionId)) {
		throw new PathTraversalError("Некорректный идентификатор организации или сессии сканирования.");
	}
	const dir = path.resolve(SCANS_STORAGE_BASE_DIR, organizationId, sessionId);
	if (!dir.startsWith(SCANS_STORAGE_BASE_DIR + path.sep)) {
		throw new PathTraversalError("Выход каталога сессии за пределы хранилища сканов.");
	}
	return dir;
}

async function resolveSafeScanInputFolder(organizationId: string, folderPath: string): Promise<string> {
	if (!folderPath || folderPath.includes("\0")) {
		throw new PathTraversalError("Недопустимый путь к каталогу сканов.");
	}
	const tenantScansDir = path.resolve(SCANS_STORAGE_BASE_DIR, organizationId);
	const resolvedCandidate = path.resolve(folderPath);
	let safeBaseDir: string | null = null;
	if (
		resolvedCandidate === tenantScansDir ||
		resolvedCandidate.startsWith(tenantScansDir + path.sep)
	) {
		safeBaseDir = tenantScansDir;
	}

	const jailedFolder = safeBaseDir
		? resolvedCandidate
		: validateAndResolvePacsLocalFilePath(organizationId, folderPath);

	const realFolder = await fs.realpath(jailedFolder);
	const anchorRoot = safeBaseDir ?? jailedFolder;
	let realAnchor = anchorRoot;
	try {
		realAnchor = await fs.realpath(anchorRoot);
	} catch {
		realAnchor = anchorRoot;
	}
	if (
		realFolder !== realAnchor &&
		!realFolder.startsWith(realAnchor + path.sep)
	) {
		throw new PathTraversalError("Обнаружена символическая ссылка за пределы разрешенного каталога сканов.");
	}
	const lowerReal = realFolder.toLowerCase();
	if (lowerReal.includes(".env") || lowerReal.includes(".git") || lowerReal.includes(".ssh")) {
		throw new PathTraversalError("Доступ к конфиденциальным каталогам запрещен.");
	}
	return realFolder;
}

function escapeIlikeWildcards(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// ============================================================================
// 3. UNIVERSAL SCANNER HUB SERVICE
// ============================================================================

export class UniversalScannerHub {
	static async processIncomingScanSession(
		options: ProcessScanSessionOptions,
	): Promise<IntraoralScanSessionRecord> {
		const { organizationId } = options;
		if (!organizationId || !isValidUuid(organizationId)) {
			throw new TenantIsolationError("UniversalScannerHub: valid organizationId is required");
		}

		// 1. Collect all input files
		let scanFiles: ScanFileInput[] = [];

		if (options.zipFilePath) {
			scanFiles = await extractScanFilesFromZipPath(options.zipFilePath);
		} else if (options.zipBuffer && options.zipBuffer.length > 0) {
			scanFiles = await extractScanFilesFromZipAsync(options.zipBuffer);
		} else if (options.files && options.files.length > 0) {
			scanFiles = [...options.files];
		} else if (options.folderPath) {
			const safeFolder = await resolveSafeScanInputFolder(organizationId, options.folderPath);
			const entries = await fs.readdir(safeFolder, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.name.startsWith(".") || entry.name.includes("\0")) {
					continue;
				}
				const fullPath = path.join(safeFolder, entry.name);
				const entryStat = await fs.lstat(fullPath);
				if (entryStat.isSymbolicLink() || !entryStat.isFile()) {
					continue;
				}
				const fileBuf = await fs.readFile(fullPath);
				scanFiles.push({ name: entry.name, buffer: fileBuf });
			}
		}

		if (scanFiles.length === 0) {
			throw new Error("UniversalScannerHub: No scan files found in session payload");
		}

		// 2. Detect Vendor and Extract Metadata
		let detectedVendor: IntraoralScannerVendor = options.vendor ?? "generic";
		let scannerModel: string | undefined = options.scannerModel;
		let extractedPatientName: string | undefined;
		const preparationTeeth: number[] = options.preparationTeethFdi ? [...options.preparationTeethFdi] : [];
		const implantTeeth: number[] = options.implantTeethFdi ? [...options.implantTeethFdi] : [];
		const materialsPlanned: Record<string, string> = options.materialsPlanned ? { ...options.materialsPlanned } : {};
		let vitaShade: string | undefined = options.vitaShade;
		let occlusionMatrix: Matrix4x4 = DEFAULT_IDENTITY_MATRIX;

		if (detectedVendor === "generic") {
			for (const f of scanFiles) {
				const v = detectScannerVendor(f.name);
				if (v !== "generic") {
					detectedVendor = v;
					break;
				}
			}
		}

		for (const f of scanFiles) {
			const ext = path.extname(f.name).toLowerCase();
			if (ext === ".xml" || ext === ".json" || ext === ".3ox" || ext === ".3px") {
				const meta = parseMetadataContent(f.name, f.buffer);
				if (meta.patientName && !extractedPatientName) extractedPatientName = meta.patientName;
				if (meta.scannerModel && !scannerModel) scannerModel = meta.scannerModel;
				if (meta.vitaShade && !vitaShade) vitaShade = meta.vitaShade;
				if (meta.matrix) occlusionMatrix = meta.matrix;
				for (const t of meta.fdiTeeth) {
					if (!preparationTeeth.includes(t)) preparationTeeth.push(t);
				}
				for (const t of meta.implantTeeth) {
					if (!implantTeeth.includes(t)) implantTeeth.push(t);
				}
				Object.assign(materialsPlanned, meta.materialsPlanned);
			}

			const toothFromFilename = extractFdiToothFromFilename(f.name);
			if (toothFromFilename !== undefined) {
				if (/scanbody|трансфер|маркер|сканбоди/i.test(f.name)) {
					if (!implantTeeth.includes(toothFromFilename)) implantTeeth.push(toothFromFilename);
				} else {
					if (!preparationTeeth.includes(toothFromFilename)) preparationTeeth.push(toothFromFilename);
				}
			}
		}

		// 3. Resolve Patient Linking & 4. Resolve Visit Linking inside RLS tenant context
		const { patientId, visitId } = await withTenantCtx(organizationId, async (tx) => {
			let resolvedPatientId = options.patientId;
			if (resolvedPatientId) {
				const [patientRow] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.id, resolvedPatientId), eq(patients.organizationId, organizationId)))
					.limit(1);

				if (!patientRow) {
					throw new Error(`UniversalScannerHub: Patient with ID ${resolvedPatientId} not found in this organization`);
				}
			} else if (extractedPatientName) {
				const safePattern = `%${escapeIlikeWildcards(extractedPatientName)}%`;
				const [matchedPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							ilike(patients.fullName, safePattern),
						),
					)
					.limit(1);

				if (matchedPatient) {
					resolvedPatientId = matchedPatient.id;
				}
			}

			if (!resolvedPatientId) {
				throw new Error(
					"UniversalScannerHub: Missing patientId. Patient could not be linked automatically from metadata.",
				);
			}

			let resolvedVisitId = options.visitId;
			if (resolvedVisitId) {
				const [visitRow] = await tx
					.select({ id: visits.id })
					.from(visits)
					.where(and(eq(visits.id, resolvedVisitId), eq(visits.organizationId, organizationId)))
					.limit(1);
				if (!visitRow) resolvedVisitId = undefined;
			}

			if (!resolvedVisitId) {
				const [activeVisit] = await tx
					.select({ id: visits.id })
					.from(visits)
					.where(and(eq(visits.organizationId, organizationId), eq(visits.patientId, resolvedPatientId)))
					.orderBy(desc(visits.createdAt))
					.limit(1);
				if (activeVisit) resolvedVisitId = activeVisit.id;
			}

			return { patientId: resolvedPatientId, visitId: resolvedVisitId };
		});

		// 5. Setup Storage Directory
		const sessionId = crypto.randomUUID();
		const sessionDir = getSessionStorageDir(organizationId, sessionId);
		await fs.mkdir(sessionDir, { recursive: true });

		try {
			// 6. Write Files to Disk and Classify Roles
			let upperJawMasterPath: string | null = null;
			let upperJawMasterUrl: string | null = null;
			let upperJawPreviewPath: string | null = null;
			let upperJawPreviewUrl: string | null = null;

			let lowerJawMasterPath: string | null = null;
			let lowerJawMasterUrl: string | null = null;
			let lowerJawPreviewPath: string | null = null;
			let lowerJawPreviewUrl: string | null = null;

			let buccalBite1Path: string | null = null;
			let buccalBite2Path: string | null = null;
			let preOpJawPath: string | null = null;
			let scanbodyPath: string | null = null;

			let screenshotFrontUrl: string | null = null;
			let screenshotUpperUrl: string | null = null;
			let screenshotLowerUrl: string | null = null;
			let screenshotOcclusionUrl: string | null = null;

			for (const file of scanFiles) {
				const cleanName = path.basename(file.name);
				if (!cleanName || cleanName === "." || cleanName === ".." || cleanName.includes("\0")) {
					throw new PathTraversalError(`Недопустимое имя файла 3D-скана: ${file.name}`);
				}
				const filePath = path.resolve(sessionDir, cleanName);
				if (!filePath.startsWith(sessionDir + path.sep)) {
					throw new PathTraversalError(`Выход файла 3D-скана за пределы каталога сессии: ${file.name}`);
				}
				await fs.writeFile(filePath, file.buffer);

				const fileUrl = `/api/v1/scans/files/${sessionId}/${encodeURIComponent(cleanName)}`;
				const classified = classifyScanFile(cleanName, detectedVendor);

				switch (classified.role) {
					case "upper_jaw":
						if (!upperJawMasterPath) {
							upperJawMasterPath = filePath;
							upperJawMasterUrl = fileUrl;
						}
						break;
					case "lower_jaw":
						if (!lowerJawMasterPath) {
							lowerJawMasterPath = filePath;
							lowerJawMasterUrl = fileUrl;
						}
						break;
					case "buccal_bite_1":
						if (!buccalBite1Path) buccalBite1Path = filePath;
						break;
					case "buccal_bite_2":
						if (!buccalBite2Path) buccalBite2Path = filePath;
						break;
					case "pre_op_jaw":
						if (!preOpJawPath) preOpJawPath = filePath;
						break;
					case "scanbody":
						if (!scanbodyPath) scanbodyPath = filePath;
						break;
					case "screenshot_preview":
						if (/front|fac|фас|лицо/i.test(cleanName)) screenshotFrontUrl = fileUrl;
						else if (/upper|max|верх/i.test(cleanName)) screenshotUpperUrl = fileUrl;
						else if (/lower|mand|ниж/i.test(cleanName)) screenshotLowerUrl = fileUrl;
						else if (/bite|occl|прикус/i.test(cleanName)) screenshotOcclusionUrl = fileUrl;
						else if (!screenshotFrontUrl) screenshotFrontUrl = fileUrl;
						break;
				}
			}

			// 7. Generate LOD1 Previews with Graceful Degradation
			if (upperJawMasterPath) {
				const upperPreviewFileName = `lod1_upper_${path.basename(upperJawMasterPath)}`;
				const upperPreviewDiskPath = path.join(sessionDir, upperPreviewFileName);
				const simplified = await generateLod1Mesh(upperJawMasterPath, upperPreviewDiskPath, 50000);
				if (simplified) {
					upperJawPreviewPath = upperPreviewDiskPath;
					upperJawPreviewUrl = `/api/v1/scans/files/${sessionId}/${encodeURIComponent(upperPreviewFileName)}`;
				} else {
					upperJawPreviewPath = upperJawMasterPath;
					upperJawPreviewUrl = upperJawMasterUrl;
				}
			}

			if (lowerJawMasterPath) {
				const lowerPreviewFileName = `lod1_lower_${path.basename(lowerJawMasterPath)}`;
				const lowerPreviewDiskPath = path.join(sessionDir, lowerPreviewFileName);
				const simplified = await generateLod1Mesh(lowerJawMasterPath, lowerPreviewDiskPath, 50000);
				if (simplified) {
					lowerJawPreviewPath = lowerPreviewDiskPath;
					lowerJawPreviewUrl = `/api/v1/scans/files/${sessionId}/${encodeURIComponent(lowerPreviewFileName)}`;
				} else {
					lowerJawPreviewPath = lowerJawMasterPath;
					lowerJawPreviewUrl = lowerJawMasterUrl;
				}
			}

			const isOcclusionPreAligned =
				(detectedVendor === "3shape" ||
					detectedVendor === "medit" ||
					detectedVendor === "itero" ||
					detectedVendor === "shining3d") &&
				Boolean(upperJawMasterPath && lowerJawMasterPath);

			// 8. Commit Session to PostgreSQL via Resilient Transaction
			const newRecord: NewIntraoralScanSessionRecord = {
				id: sessionId,
				organizationId,
				patientId,
				visitId: visitId || null,
				labOrderId: options.labOrderId || null,
				vendor: detectedVendor,
				scannerModel: scannerModel || (detectedVendor !== "generic" ? `${detectedVendor.toUpperCase()} Scanner` : null),
				upperJawMasterPath,
				upperJawMasterUrl,
				upperJawPreviewPath,
				upperJawPreviewUrl,
				lowerJawMasterPath,
				lowerJawMasterUrl,
				lowerJawPreviewPath,
				lowerJawPreviewUrl,
				buccalBite1Path,
				buccalBite2Path,
				preOpJawPath,
				scanbodyPath,
				occlusionMatrix: [...occlusionMatrix],
				isOcclusionPreAligned,
				screenshotFrontUrl,
				screenshotUpperUrl,
				screenshotLowerUrl,
				screenshotOcclusionUrl,
				preparationTeethFdi: preparationTeeth.sort((a, b) => a - b),
				implantTeethFdi: implantTeeth.sort((a, b) => a - b),
				materialsPlanned,
				vitaShade: vitaShade || null,
				status: "ready",
				errorMessage: null,
			};

			const [createdSession] = await withResilientTransaction(
				async (tx) => {
					return tx.insert(intraoralScanSessions).values(newRecord).returning();
				},
				{ tenantId: organizationId },
			);

			if (!createdSession) {
				throw new Error("UniversalScannerHub: Failed to insert scan session into database");
			}

			return createdSession;
		} catch (err) {
			await fs.rm(sessionDir, { recursive: true, force: true }).catch((rmErr) => {
				scannerHubLogger.warn({ err: rmErr, sessionDir }, "Failed to cleanup intraoral session directory on rollback");
			});
			throw err;
		}
	}

	static async getScanSessionById(
		organizationId: string,
		sessionId: string,
	): Promise<IntraoralScanSessionRecord | null> {
		if (!isValidUuid(organizationId) || !isValidUuid(sessionId)) {
			return null;
		}
		return withTenantCtx(organizationId, async (tx) => {
			const [session] = await tx
				.select()
				.from(intraoralScanSessions)
				.where(
					and(
						eq(intraoralScanSessions.id, sessionId),
						eq(intraoralScanSessions.organizationId, organizationId),
					),
				)
				.limit(1);

			return session ?? null;
		});
	}

	static async listScanSessionsByPatient(
		organizationId: string,
		patientId: string,
	): Promise<IntraoralScanSessionRecord[]> {
		if (!isValidUuid(organizationId) || !isValidUuid(patientId)) {
			return [];
		}
		return withTenantCtx(organizationId, async (tx) => {
			return tx
				.select()
				.from(intraoralScanSessions)
				.where(
					and(
						eq(intraoralScanSessions.organizationId, organizationId),
						eq(intraoralScanSessions.patientId, patientId),
					),
				)
				.orderBy(desc(intraoralScanSessions.capturedAt));
		});
	}

	static async resolveScanFile(
		organizationId: string,
		sessionId: string,
		fileName: string,
	): Promise<{ filePath: string; mimeType: string; sizeBytes: number } | null> {
		const session = await this.getScanSessionById(organizationId, sessionId);
		if (!session) return null;

		const sessionDir = getSessionStorageDir(organizationId, sessionId);
		const cleanBaseName = path.basename(fileName);
		if (!cleanBaseName || cleanBaseName === "." || cleanBaseName === ".." || cleanBaseName.includes("\0")) {
			return null;
		}
		const absoluteTarget = path.resolve(sessionDir, cleanBaseName);

		if (!absoluteTarget.startsWith(sessionDir + path.sep)) return null;

		try {
			const stats = await fs.lstat(absoluteTarget);
			if (stats.isSymbolicLink() || !stats.isFile()) return null;

			const ext = path.extname(cleanBaseName).toLowerCase();
			let mimeType = "application/octet-stream";
			switch (ext) {
				case ".stl": mimeType = "model/stl"; break;
				case ".ply": mimeType = "model/ply"; break;
				case ".obj": mimeType = "model/obj"; break;
				case ".json": mimeType = "application/json"; break;
				case ".xml": mimeType = "application/xml"; break;
				case ".png": mimeType = "image/png"; break;
				case ".jpg":
				case ".jpeg": mimeType = "image/jpeg"; break;
				case ".webp": mimeType = "image/webp"; break;
			}

			return {
				filePath: absoluteTarget,
				mimeType,
				sizeBytes: stats.size,
			};
		} catch (err) {
			scannerHubLogger.debug({ err, sessionId, fileName }, "Intraoral scan file lookup failed");
			return null;
		}
	}
}
