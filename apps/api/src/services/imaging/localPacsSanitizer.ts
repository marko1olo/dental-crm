/**
 * DENTE Dental CRM — Local PACS & Radiology Storage Sanitizer and Security Jail.
 *
 * Enforces strict multi-tenant isolation, path traversal immunity,
 * and magic bytes validation for medical imaging scans per Mandate 8b and 152-FZ.
 */

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { isHeicOrHeifBuffer } from "@dental/shared";

export class PathTraversalError extends Error {
	constructor(message = "Обнаружена попытка выхода за пределы изолированного каталога хранилища (Path Traversal).") {
		super(message);
		this.name = "PathTraversalError";
	}
}

export class TenantIsolationError extends Error {
	constructor(message = "Доступ к файлам другой организации запрещен.") {
		super(message);
		this.name = "TenantIsolationError";
	}
}

export class InvalidMagicBytesError extends Error {
	constructor(message = "Формат файла не соответствует сигнатуре разрешенных медицинских снимков (DICOM / PNG / JPEG / HEIC).") {
		super(message);
		this.name = "InvalidMagicBytesError";
	}
}

export type AllowedImagingFormat = "dicom" | "png" | "jpeg" | "heic";

/**
 * Detects magic bytes / signatures for medical imaging and clinical photos:
 * - DICOM: offset 128 'DICM' or preamble-less group 0x0002 / 0x0008
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - JPEG: FF D8 FF
 * - HEIC / HEIF: bytes 4..7 'ftyp' with supported brands
 */
export function detectImagingMagicBytes(buffer: Buffer | Uint8Array): AllowedImagingFormat | null {
	if (!buffer || buffer.length < 3) return null;

	// 1. JPEG: FF D8 FF
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return "jpeg";
	}

	// 2. PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		buffer.length >= 8 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47 &&
		buffer[4] === 0x0d &&
		buffer[5] === 0x0a &&
		buffer[6] === 0x1a &&
		buffer[7] === 0x0a
	) {
		return "png";
	}

	// 3. HEIC / HEIF
	if (isHeicOrHeifBuffer(buffer)) {
		return "heic";
	}

	// 4. DICOM standard preamble: offset 128 has 'DICM'
	if (buffer.length >= 132) {
		const isDicm =
			(buffer[128] ?? 0) === 0x44 && // D
			(buffer[129] ?? 0) === 0x49 && // I
			(buffer[130] ?? 0) === 0x43 && // C
			(buffer[131] ?? 0) === 0x4d; // M
		if (isDicm) return "dicom";
	}

	// 5. DICOM preamble-less: starts with tag group 0x0002 or 0x0008
	if (buffer.length >= 8) {
		const groupLE = (buffer[0] ?? 0) | ((buffer[1] ?? 0) << 8);
		const groupBE = ((buffer[0] ?? 0) << 8) | (buffer[1] ?? 0);
		if (groupLE === 0x0002 || groupLE === 0x0008 || groupBE === 0x0002 || groupBE === 0x0008) {
			return "dicom";
		}
	}

	return null;
}

/**
 * Root storage directory for clinic PACS / radiology files.
 */
export function getPacsStorageRoot(): string {
	const configured = process.env.DENTE_PACS_STORAGE_ROOT?.trim() || process.env.DENTE_IMAGING_STORAGE_ROOT?.trim();
	if (configured) return path.resolve(configured);
	return path.resolve(process.cwd(), "uploads", "pacs");
}

/**
 * Resolves isolated directory for a tenant's files and ensures it exists.
 * Protects against Path Traversal in organizationId.
 */
export function getPacsTenantStorageDir(organizationId: string): string {
	if (!organizationId || typeof organizationId !== "string") {
		throw new TenantIsolationError("Идентификатор организации обязателен.");
	}
	const trimmed = organizationId.trim();
	if (
		trimmed.includes("/") ||
		trimmed.includes("\\") ||
		trimmed.includes("\0") ||
		trimmed.includes("..") ||
		!/^[a-zA-Z0-9_-]+$/.test(trimmed)
	) {
		throw new PathTraversalError("Недопустимый идентификатор организации для файлового хранилища.");
	}

	const root = getPacsStorageRoot();
	const tenantDir = path.resolve(root, trimmed);
	if (!tenantDir.startsWith(root + path.sep) && tenantDir !== root) {
		throw new PathTraversalError("Каталог организации выходит за пределы хранилища.");
	}
	return tenantDir;
}

/**
 * Resolves candidate file path within tenant's isolated directory.
 * Strict protection against Path Traversal (../, null bytes, escaped paths).
 */
export function resolvePacsTenantStoragePath(organizationId: string, candidatePath: string): string {
	if (!candidatePath || typeof candidatePath !== "string") {
		throw new PathTraversalError("Путь к файлу снимка обязателен.");
	}
	if (candidatePath.includes("\0")) {
		throw new PathTraversalError("Недопустимый путь к файлу: обнаружен null-байт.");
	}

	const tenantDir = getPacsTenantStorageDir(organizationId);
	let decoded = candidatePath;
	try {
		decoded = decodeURIComponent(candidatePath);
	} catch {
		// keep original if decoding fails
	}
	if (decoded.includes("\0")) {
		throw new PathTraversalError("Недопустимый путь к файлу: обнаружен null-байт.");
	}

	const normalizedCand = decoded.replaceAll("\\", "/");
	let resolved: string;
	if (path.isAbsolute(decoded)) {
		resolved = path.resolve(decoded);
	} else if (normalizedCand.startsWith("uploads/") || normalizedCand.startsWith(".data/")) {
		resolved = path.resolve(process.cwd(), normalizedCand);
	} else {
		resolved = path.resolve(tenantDir, decoded);
	}

	// Strict containment check: must be strictly inside tenantDir
	if (!resolved.startsWith(tenantDir + path.sep) && resolved !== tenantDir) {
		throw new PathTraversalError(
			`Обнаружена попытка несанкционированного доступа к файлу за пределами хранилища организации: ${candidatePath}`,
		);
	}

	return resolved;
}

/**
 * Validates and resolves local workstation radiology file path for offline PACS registration.
 * Allows legitimate workstation storage paths while strictly blocking Path Traversal (../, null bytes)
 * and forbidden OS system directories.
 */
export function validateAndResolvePacsLocalFilePath(organizationId: string, candidatePath: string): string {
	if (!candidatePath || typeof candidatePath !== "string") {
		throw new PathTraversalError("Путь к файлу снимка обязателен.");
	}
	if (candidatePath.includes("\0")) {
		throw new PathTraversalError("Недопустимый путь к файлу: обнаружен null-байт.");
	}

	let decoded = candidatePath;
	try {
		decoded = decodeURIComponent(candidatePath);
	} catch {
		// keep original
	}
	if (decoded.includes("\0")) {
		throw new PathTraversalError("Недопустимый путь к файлу: обнаружен null-байт.");
	}

	if (decoded.includes("..")) {
		throw new PathTraversalError("Недопустимый путь к файлу: обнаружена последовательность выхода из каталога (..).");
	}

	if (path.isAbsolute(decoded)) {
		const normalized = path.normalize(decoded);
		if (normalized.includes("..")) {
			throw new PathTraversalError("Недопустимый путь к файлу: обнаружена последовательность выхода из каталога (..).");
		}

		// Strict cross-tenant isolation if path is inside PACS storage root
		const storageRoot = getPacsStorageRoot();
		const tenantDir = getPacsTenantStorageDir(organizationId);
		if (normalized.startsWith(storageRoot + path.sep) && !normalized.startsWith(tenantDir + path.sep) && normalized !== tenantDir) {
			throw new TenantIsolationError("Доступ к файлам другой организации запрещен.");
		}

		const lower = normalized.toLowerCase();
		const forbiddenPrefixes = [
			"c:\\windows",
			"c:\\program files",
			"c:\\program files (x86)",
			"c:\\programdata",
			"/etc",
			"/sys",
			"/proc",
			"/root",
			"/var/run",
			"/bin",
			"/sbin",
			"/boot",
			"/dev",
		];

		// Разрешаем авторизованное системное хранилище клиники DenteDental
		const isDenteSystemStorage =
			lower.startsWith("c:\\programdata\\dentedental") ||
			lower.startsWith("/library/application support/dentedental");

		if (!isDenteSystemStorage) {
			for (const prefix of forbiddenPrefixes) {
				if (lower.startsWith(prefix)) {
					throw new PathTraversalError(`Запрещен доступ к системным директориям операционной системы: ${candidatePath}`);
				}
			}
		}

		const sensitiveTokens = [".env", ".git", ".ssh", "id_rsa", "id_ed25519"];
		for (const token of sensitiveTokens) {
			if (lower.includes(token)) {
				throw new PathTraversalError(`Запрещен доступ к конфиденциальным файлам: ${candidatePath}`);
			}
		}

		return normalized;
	}

	const normalizedRel = decoded.replaceAll("\\", "/");
	if (normalizedRel.startsWith("uploads/") || normalizedRel.startsWith(".data/")) {
		const resolved = path.resolve(process.cwd(), normalizedRel);
		const storageRoot = getPacsStorageRoot();
		const tenantDir = getPacsTenantStorageDir(organizationId);
		if (
			resolved.startsWith(storageRoot + path.sep) &&
			!resolved.startsWith(tenantDir + path.sep) &&
			resolved !== tenantDir
		) {
			throw new TenantIsolationError("Доступ к файлам другой организации запрещен.");
		}
		return resolved;
	}

	return resolvePacsTenantStoragePath(organizationId, decoded);
}

/**
 * Normalizes any storage path to a project-relative POSIX path (e.g. uploads/dicom/...).
 * Prevents storing absolute Windows paths (C:\Users\...) in database columns.
 */
export function toNormalizedRelativePacsStoragePath(
	organizationId: string,
	candidatePath: string,
	subfolder = "dicom",
): string {
	if (!candidatePath || typeof candidatePath !== "string") return "";
	let clean = candidatePath.trim().replaceAll("\\", "/");
	if (clean.includes("\0") || clean.includes("..")) {
		throw new PathTraversalError("Недопустимый путь к файлу снимка.");
	}

	const cwd = process.cwd().replaceAll("\\", "/");
	if (clean.toLowerCase().startsWith(cwd.toLowerCase() + "/")) {
		clean = clean.slice(cwd.length + 1);
	}

	// Absolute Windows (C:/...) or POSIX (/...) path: normalize into isolated tenant storage
	if (/^[a-zA-Z]:\//i.test(clean) || clean.startsWith("/")) {
		const fileName = path.posix.basename(clean);
		return path.posix.join("uploads", subfolder, organizationId, fileName);
	}

	// Already relative path in uploads or .data
	if (clean.startsWith("uploads/") || clean.startsWith(".data/")) {
		return clean;
	}

	// Relative filename or subpath
	return path.posix.join("uploads", subfolder, organizationId, clean);
}
