import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createApiLogger, safeLogError } from "../../observability/index.js";

const logger = createApiLogger("backupWorker");

export const ENCRYPTION_ALGORITHM = "aes-256-gcm";
export const IV_LENGTH = 12;
export const GCM_AUTH_TAG_LENGTH = 16;
export const CLUSTER_BACKUP_MAGIC = Buffer.from("DENTECL2", "ascii");
export const REQUIRED_KEY_BYTES = 32;
export const TENANT_BACKUP_FORMAT = "DENTE_TENANT_BACKUP_V1";
export const PUBLIC_SAMPLE_KEY = "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET";

export interface BackupResult {
	success: boolean;
	filePath?: string | undefined;
	error?: string | undefined;
}

export function backupsDirectory(): string {
	return (
		process.env.DENTE_BACKUP_DIR?.trim() ||
		path.resolve(process.cwd(), "../../backups")
	);
}

export function resolveEncryptionKey(): { key: Buffer } | { error: string } {
	const raw = process.env.CLINIC_ENCRYPTION_KEY?.trim();
	if (!raw) {
		return {
			error:
				"CLINIC_ENCRYPTION_KEY не задан. Копии не создаются: без ключа их нельзя зашифровать, а копия медицинских данных без шифрования недопустима.",
		};
	}
	if (raw === PUBLIC_SAMPLE_KEY) {
		return {
			error:
				"CLINIC_ENCRYPTION_KEY равен примеру из репозитория. Задайте собственный ключ длиной 32 байта.",
		};
	}
	const keyBytes = Buffer.from(raw, "utf8");
	if (keyBytes.length < REQUIRED_KEY_BYTES) {
		return {
			error: `CLINIC_ENCRYPTION_KEY короче ${REQUIRED_KEY_BYTES} байт. Короткий ключ раньше молча дополнялся нулями, что резко ослабляло шифрование.`,
		};
	}
	const key =
		keyBytes.length === REQUIRED_KEY_BYTES
			? keyBytes
			: crypto.createHash("sha256").update(keyBytes).digest();
	return { key };
}

export function removePartialFile(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
	} catch (error) {
		logger.warn(
			{ err: safeLogError(error), filePath },
			"Не удалось удалить незавершённый файл копии",
		);
	}
}

export function pruneOldBackups(
	retentionDays = Number(process.env.DENTE_BACKUP_RETENTION_DAYS ?? 30),
): void {
	if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
	const dir = backupsDirectory();
	if (!fs.existsSync(dir)) return;
	const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
	try {
		for (const name of fs.readdirSync(dir)) {
			const isClusterBackup =
				name.startsWith("dente_crm_backup_") && name.endsWith(".sql.enc");
			const isTenantBackup =
				name.startsWith("org_") && name.endsWith(".dentalbackup");
			if (!isClusterBackup && !isTenantBackup) continue;
			const full = path.join(dir, name);
			try {
				if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
			} catch (unlinkErr) {
				logger.debug(
					{ err: safeLogError(unlinkErr), file: full },
					"Файл бэкапа уже удалён параллельно",
				);
			}
		}
	} catch (error) {
		logger.warn(
			{ err: safeLogError(error) },
			"Не удалось очистить старые копии",
		);
	}
}
