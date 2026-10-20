import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
	backupsDirectory,
	createEncryptedBackup,
} from "../../services/backupWorker.js";
import { requireSettingsAccess } from "./helpers.js";

export function registerBackupRoutes(app: FastifyInstance): void {
	/**
	 * Получить список реальных зашифрованных копий на диске с SHA-256 и точным размером в байтах.
	 */
	app.get("/api/settings/backup/list", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;

		try {
			const dir = backupsDirectory();
			if (!fs.existsSync(dir)) {
				return { backups: [] };
			}

			const files = fs.readdirSync(dir);
			const backups = files
				.filter(
					(f) =>
						f.endsWith(".sql.enc") ||
						f.endsWith(".dente") ||
						f.endsWith(".dentalbackup"),
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
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;

		const outcome = await createEncryptedBackup();
		if (!outcome.success || !outcome.filePath) {
			reply.code(500);
			return {
				success: false,
				error: outcome.error || "Не удалось создать резервную копию",
			};
		}

		const stat = fs.statSync(outcome.filePath);
		const fileBuffer = fs.readFileSync(outcome.filePath);
		const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

		return {
			success: true,
			filePath: outcome.filePath,
			filename: path.basename(outcome.filePath),
			sizeBytes: stat.size,
			createdAt: stat.mtime.toISOString(),
			sha256,
		};
	});
}
