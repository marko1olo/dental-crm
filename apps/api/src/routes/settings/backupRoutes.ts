import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { requireDatabaseUrl } from "../../db/client.js";
import { safeLogError } from "../../observability/logger.js";
import { getRequestIdentity } from "../../security/identity.js";
import { requireSettingsSensitiveReadAccess } from "./settingsHelpers/settingsGuards.js";
import {
	backupsDirectory,
	createTenantEncryptedBackup,
	resolveEncryptionKey,
	restoreTenantSnapshotStreaming,
} from "../../services/backupWorker.js";

const createBackupBodySchema = z
	.object({
		sanitizeForSupport: z.boolean().optional(),
	})
	.strict()
	.optional();

const restoreBackupBodySchema = z
	.object({
		filename: z.string().min(1).max(255),
	})
	.strict();

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

async function readArchiveMagic(filePath: string): Promise<string> {
	const fh = await fsPromises.open(filePath, "r");
	const buf = Buffer.alloc(8);
	try {
		const { bytesRead } = await fh.read(buf, 0, 8, 0);
		const ascii = buf.subarray(0, bytesRead).toString("ascii");
		if (ascii === "DENTETB2" || ascii === "DENTETB1") return ascii;
		return "legacy";
	} finally {
		await fh.close();
	}
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
	const backupAuthOptions = {
		requireStaffToken: true,
		allowAdminSecretBypass: true,
	} as const;

	/**
	 * Получить список реальных зашифрованных копий на диске с SHA-256 и точным размером в байтах.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/backup/list",
		permission: "settings.read",
		authOptions: backupAuthOptions,
		handler: async ({ organizationId, request, reply }) => {
			const guardedOrgId = await requireSettingsSensitiveReadAccess(request, reply);
			if (!guardedOrgId || reply.sent) return;
			const orgId = organizationId ?? guardedOrgId;

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
						let format = "legacy";
						try {
							[sha256, format] = await Promise.all([
								computeFileSha256Stream(fullPath),
								readArchiveMagic(fullPath),
							]);
						} catch (hashErr: unknown) {
							request.log.warn(
								{ err: safeLogError(hashErr), filename },
								"[backup] Failed to compute backup metadata",
							);
							sha256 = "";
						}
						return {
							id: filename,
							filename,
							filePath: fullPath,
							format,
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
		},
	});

	/**
	 * Запустить реальное создание зашифрованной резервной копии базы клиники (DENTETB2).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/backup/create",
		permission: "settings.write",
		authOptions: backupAuthOptions,
		handler: async ({ principal, organizationId, runWriteTx, request, reply }) => {
			const orgId = organizationId;
			if (!orgId) {
				reply.code(401);
				return { error: "StaffAuthRequired" };
			}

			const bodyParsed = createBackupBodySchema.safeParse(request.body);
			if (!bodyParsed.success) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Лишние или некорректные параметры запроса резервного копирования.",
				};
			}

			const identity = getRequestIdentity(request);
			const actorRole = principal?.role ?? identity.role;
			const actorUserId = principal?.userId ?? identity.userId;
			if (actorUserId && actorRole !== "owner") {
				reply.code(403);
				return {
					error: "PermissionDenied",
					message:
						"Создание полной резервной копии базы данных доступно только владельцу клиники.",
				};
			}

			const outcome = await createTenantEncryptedBackup(orgId, {
				sanitizeForSupport: bodyParsed.data?.sanitizeForSupport,
			});
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
				await runWriteTx(async (tx) =>
					recordAuditEventInDb(
						orgId,
						{
							entityType: "backup",
							entityId: finalFilename,
							action: "BACKUP_CREATED",
							actorUserId,
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
				format: "DENTETB2",
				sizeBytes: stat.size,
				createdAt: stat.mtime.toISOString(),
				sha256,
			};
		},
	});

	/**
	 * Потоково восстановить клинику из локальной зашифрованной резервной копии
	 * (`DENTETB2` или legacy `DENTETB1`) с проверкой GCM AuthTag до `COMMIT`.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/backup/restore",
		permission: "settings.write",
		authOptions: backupAuthOptions,
		handler: async ({ principal, organizationId, runWriteTx, request, reply }) => {
			const orgId = organizationId;
			if (!orgId) {
				return reply.code(401).send({ error: "StaffAuthRequired" });
			}

			const bodyParsed = restoreBackupBodySchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Укажите корректное имя файла резервной копии.",
				});
			}

			const identity = getRequestIdentity(request);
			const actorRole = principal?.role ?? identity.role;
			const actorUserId = principal?.userId ?? identity.userId;
			if (actorUserId && actorRole !== "owner") {
				return reply.code(403).send({
					error: "PermissionDenied",
					message:
						"Восстановление резервной копии базы данных доступно только владельцу клиники.",
				});
			}

			const keyResult = resolveEncryptionKey();
			if ("error" in keyResult) {
				return reply.code(500).send({
					error: "EncryptionKeyMissing",
					message: keyResult.error,
				});
			}

			const { filename } = bodyParsed.data;
			const orgPrefix = `org_${orgId}_`;
			if (
				filename.includes("/") ||
				filename.includes("\\") ||
				filename.includes("..") ||
				path.basename(filename) !== filename ||
				!filename.startsWith(orgPrefix) ||
				!filename.endsWith(".dentalbackup")
			) {
				return reply.code(400).send({
					error: "InvalidBackupFilename",
					message: "Недопустимое имя файла резервной копии для этой организации.",
				});
			}

			const rootDir = path.resolve(backupsDirectory());
			const resolvedPath = path.resolve(rootDir, filename);
			if (!resolvedPath.startsWith(`${rootDir}${path.sep}`)) {
				return reply.code(400).send({
					error: "InvalidBackupPath",
					message: "Путь к резервной копии выходит за пределы безопасной директории.",
				});
			}

			if (!(await pathExists(resolvedPath))) {
				return reply.code(404).send({
					error: "BackupNotFound",
					message: "Файл резервной копии не найден.",
				});
			}

			const pgClient = new pg.Client({ connectionString: requireDatabaseUrl() });
			try {
				await pgClient.connect();
				const result = await restoreTenantSnapshotStreaming({
					archivePath: resolvedPath,
					encryptionKey32Bytes: keyResult.key,
					expectedOrganizationId: orgId,
					pgClient,
				});

				try {
					await runWriteTx(async (tx) =>
						recordAuditEventInDb(
							orgId,
							{
								entityType: "backup",
								entityId: filename,
								action: "BACKUP_RESTORED",
								actorUserId,
								reason: `format=${result.format}, tables=${result.restoredTables}, rows=${result.restoredRows}`,
							},
							tx,
						),
					);
				} catch (auditErr: unknown) {
					request.log.warn(
						{ err: safeLogError(auditErr), organizationId: orgId, filename },
						"[backup] Failed to record BACKUP_RESTORED audit event",
					);
				}

				return {
					success: true,
					filename,
					format: result.format,
					restoredTables: result.restoredTables,
					restoredRows: result.restoredRows,
				};
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				request.log.error(
					{ err: safeLogError(err), organizationId: orgId, filename },
					"[backup] Failed to restore tenant backup",
				);
				const isIntegrityOrTenantErr =
					/Unsupported state|unable to authenticate|Tenant mismatch|Corrupted backup|Unsupported archive|Incomplete backup/i.test(
						msg,
					);
				return reply.code(isIntegrityOrTenantErr ? 400 : 500).send({
					success: false,
					error: isIntegrityOrTenantErr ? "BackupIntegrityFailed" : "BackupRestoreFailed",
					message: isIntegrityOrTenantErr
						? "Архив повреждён, подделан или не принадлежит данной клинике; изменения в БД полностью отменены."
						: "Ошибка восстановления резервной копии; изменения в БД отменены.",
				});
			} finally {
				try {
					await pgClient.end();
				} catch (endErr) {
					request.log.warn(
						{ err: safeLogError(endErr) },
						"[backup] Failed to close restore pg.Client",
					);
				}
			}
		},
	});
}
