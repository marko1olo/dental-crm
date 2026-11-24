import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { safeLogError } from "../../observability/logger.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	backupsDirectory,
	createTenantEncryptedBackup,
} from "../../services/backupWorker.js";
import {
	requireSettingsMutationAccess,
	requireSettingsSensitiveReadAccess,
} from "./helpers.js";

export function registerBackupRoutes(app: FastifyInstance): void {
	/**
	 * Получить список реальных зашифрованных копий на диске с SHA-256 и точным размером в байтах.
	 */
	app.get("/api/settings/backup/list", async (request, reply) => {
		const orgId = await requireSettingsSensitiveReadAccess(request, reply);
		if (!orgId) return;

		try {
			const dir = backupsDirectory();
			if (!fs.existsSync(dir)) {
				return { backups: [] };
			}

			const files = fs.readdirSync(dir);
			const orgPrefix = `org_${orgId}_`;
			const backups = files
				.filter(
					(f) =>
						f.startsWith(orgPrefix) &&
						(f.endsWith(".sql.enc") ||
							f.endsWith(".dente") ||
							f.endsWith(".dentalbackup")),
				)
				.map((filename) => {
					const fullPath = path.join(dir, filename);
					const stat = fs.statSync(fullPath);
					let sha256 = "";
					try {
						const fileBuffer = fs.readFileSync(fullPath);
						sha256 = crypto
							.createHash("sha256")
							.update(fileBuffer)
							.digest("hex");
					} catch (hashErr: unknown) {
						request.log.warn(
							{ err: safeLogError(hashErr), filename },
							"[backup] Failed to compute backup SHA-256",
						);
						sha256 = "";
					}
					return {
						id: filename,
						filename,
						filePath: fullPath,
						sizeBytes: stat.size,
						createdAt: stat.mtime.toISOString(),
						sha256,
					};
				})
				.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

			return { backups };
		} catch (err: unknown) {
			request.log.error(
				{ err: safeLogError(err) },
				"[backup] Failed to list backup directory",
			);
			reply.code(500);
			return {
				error: "BackupListFailed",
				message:
					err instanceof Error
						? err.message
						: "Ошибка получения списка резервных копий",
			};
		}
	});

	/**
	 * Запустить реальное создание зашифрованной резервной копии базы клиники.
	 */
	app.post("/api/settings/backup/create", async (request, reply) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		if (identity.userId && identity.role !== "owner") {
			reply.code(403);
			return {
				error: "PermissionDenied",
				message:
					"Создание полной резервной копии базы данных доступно только владельцу клиники.",
			};
		}

		const outcome = await createTenantEncryptedBackup(orgId);
		if (!outcome.success || !outcome.filePath) {
			reply.code(500);
			return {
				success: false,
				error: outcome.error || "Не удалось создать резервную копию",
			};
		}

		let finalPath = outcome.filePath;
		let finalFilename = path.basename(finalPath);
		const orgPrefix = `org_${orgId}_`;
		if (!finalFilename.startsWith(orgPrefix)) {
			const targetFilename = `${orgPrefix}${finalFilename}`;
			const targetPath = path.join(path.dirname(finalPath), targetFilename);
			try {
				fs.renameSync(finalPath, targetPath);
				finalPath = targetPath;
				finalFilename = targetFilename;
			} catch (renameErr: unknown) {
				request.log.warn(
					{ err: safeLogError(renameErr), finalPath, targetPath },
					"[backup] Failed to rename backup file with custom prefix",
				);
			}
		}

		const stat = fs.statSync(finalPath);
		const fileBuffer = fs.readFileSync(finalPath);
		const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

		try {
			await withTenantCtx(orgId, async (tx) =>
				recordAuditEventInDb(
					orgId,
					{
						entityType: "backup",
						entityId: finalFilename,
						action: "BACKUP_CREATED",
						actorUserId: identity.userId,
						reason: `sizeBytes=${stat.size}, sha256=${sha256.slice(0, 16)}`,
					},
					tx,
				),
			);
		} catch (auditErr: unknown) {
			request.log.warn(
				{ err: safeLogError(auditErr), organizationId: orgId, filename: finalFilename },
				"[backup] Failed to record BACKUP_CREATED audit event",
			);
		}

		return {
			success: true,
			filePath: finalPath,
			filename: finalFilename,
			sizeBytes: stat.size,
			createdAt: stat.mtime.toISOString(),
			sha256,
		};
	});
}
