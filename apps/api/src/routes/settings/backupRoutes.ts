import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
	backupsDirectory,
	createEncryptedBackup,
} from "../../services/backupWorker.js";
import {
	requireSettingsAccess,
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
					} catch {
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

		const outcome = await createEncryptedBackup();
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
			} catch {
				// Оставляем исходный путь при ошибке rename
			}
		}

		const stat = fs.statSync(finalPath);
		const fileBuffer = fs.readFileSync(finalPath);
		const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

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
