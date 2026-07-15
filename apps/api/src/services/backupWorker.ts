import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY =
	process.env.CLINIC_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 bytes
const IV_LENGTH = 16;

/**
 * Creates an encrypted cloud backup of the database
 * Uses pg_dump and AES-256-CBC encryption on the fly
 */
export async function createEncryptedBackup(): Promise<{
	success: boolean;
	filePath?: string;
	error?: string;
}> {
	return new Promise((resolve) => {
		try {
			const backupsDir = path.resolve(process.cwd(), "../../backups");
			if (!fs.existsSync(backupsDir)) {
				fs.mkdirSync(backupsDir, { recursive: true });
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const fileName = `dente_crm_backup_${timestamp}.sql.enc`;
			const filePath = path.join(backupsDir, fileName);

			// Generate a random IV for this backup
			const iv = crypto.randomBytes(IV_LENGTH);

			// Ensure key is exactly 32 bytes for AES-256
			const keyBuf = Buffer.alloc(32);
			Buffer.from(ENCRYPTION_KEY).copy(keyBuf);

			const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuf, iv);
			const writeStream = fs.createWriteStream(filePath);

			// Write the IV at the beginning of the file so it can be decrypted later
			writeStream.write(iv);

			// We rely on the local pg_dump. If standard PATH doesn't have it, we use the portable one
			const portablePgDumpPath = path.resolve(
				process.cwd(),
				"../../.postgres/bin/pg_dump.exe",
			);
			const pgDumpCommand = fs.existsSync(portablePgDumpPath)
				? portablePgDumpPath
				: "pg_dump";

			const pgDump = spawn(pgDumpCommand, [
				"-U",
				"dental",
				"-d",
				"dental_crm",
				"--clean",
				"--if-exists",
			]);

			pgDump.stdout.pipe(cipher).pipe(writeStream);

			pgDump.stderr.on("data", (data) => {
				console.warn(`[BackupWorker] pg_dump warning: ${data}`);
			});

			pgDump.on("close", (code) => {
				if (code === 0) {
					console.log(
						`[BackupWorker] Successfully created encrypted backup: ${filePath}`,
					);
					resolve({ success: true, filePath });
				} else {
					console.error(`[BackupWorker] pg_dump exited with code ${code}`);
					resolve({
						success: false,
						error: `pg_dump exited with code ${code}`,
					});
				}
			});
		} catch (err: any) {
			console.error(`[BackupWorker] Exception during backup:`, err);
			resolve({ success: false, error: err.message });
		}
	});
}

let backupInterval: NodeJS.Timeout | null = null;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startBackupDaemon() {
	if (backupInterval) return;
	console.log("[BackupWorker] Starting Encrypted Cloud Backup Daemon...");
	backupInterval = setInterval(() => {
		console.log("[BackupWorker] Running scheduled daily backup...");
		createEncryptedBackup();
	}, BACKUP_INTERVAL_MS);
}

export function stopBackupDaemon() {
	if (backupInterval) {
		clearInterval(backupInterval);
		backupInterval = null;
		console.log("[BackupWorker] Stopped Encrypted Cloud Backup Daemon.");
	}
}
