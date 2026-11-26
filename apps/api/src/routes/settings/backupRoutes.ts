import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
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

const createBackupBodySchema = z.object({}).strict().optional();

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fsPromises.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function computeFileSha256Stream(filePath: string): Promise<string> {
	const hash = crypto.createHash("sha256");
	const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
	for await (const chunk of stream) {
		hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return hash.digest("hex");
}

async function mapWithConcurrency<T, R>(
	items: readonly T[],
	concurrency: number,
	mapper: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;
	const workerCount = Math.min(Math.max(1, concurrency), items.length);
	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (cursor < items.length) {
				const idx = cursor++;
				const item = items[idx];
				if (item !== undefined) {
					results[idx] = await mapper(item);
				}
			}
		}),
	);
	return results;
}

export function registerBackupRoutes(app: FastifyInstance): void {
	/**
	 * Получить список реальных зашифрованных копий на диске с SHA-256 и точным размером в байтах.
	 */
	app.get("/api/settings/backup/list", async (request, reply) => {
		const orgId = await requireSettingsSensitiveReadAccess(request, reply);
		if (!orgId) return;

		try {
			const dir = backupsDirectory();
			if (!(await pathExists(dir))) {
				return { backups: [] };
			}

			const files = await fsPromises.readdir(dir);
			const orgPrefix = `org_${orgId}_`;
			const matchingFiles = files.filter(
				(f) =>
					f.startsWith(orgPrefix) &&
					(f.endsWith(".sql.enc") ||
						f.endsWith(".dente") ||
						f.endsWith(".dentalbackup")),
			);

			const backups = (
				await mapWithConcurrency(matchingFiles, 4, async (filename) => {
					const fullPath = path.join(dir, filename);
					const stat = await fsPromises.stat(fullPath);
					let sha256 = "";
					try {
						sha256 = await computeFileSha256Stream(fullPath);
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
			).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

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

		const bodyParsed = createBackupBodySchema.safeParse(request.body);
		if (!bodyParsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Лишние или некорректные параметры запроса резервного копирования.",
			};
		}

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
				await fsPromises.rename(finalPath, targetPath);
				finalPath = targetPath;
				finalFilename = targetFilename;
			} catch (renameErr: unknown) {
				request.log.warn(
					{ err: safeLogError(renameErr), finalPath, targetPath },
					"[backup] Failed to rename backup file with custom prefix",
				);
			}
		}

		const stat = await fsPromises.stat(finalPath);
		const sha256 = await computeFileSha256Stream(finalPath);

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
				{
					err: safeLogError(auditErr),
					organizationId: orgId,
					filename: finalFilename,
				},
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
