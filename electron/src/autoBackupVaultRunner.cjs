/**
 * DENTE Dental CRM — Automated Local PG18 Backup Vault Runner
 *
 * Triggers encrypted tenant backups via the local API or streams pg_dump
 * into `userData/backups/` with bounded retention and non-blocking timers.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { spawn } = require("node:child_process");
const { Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("AutoBackupVault");

const VAULT_MAGIC = Buffer.from("DENTEVL2", "ascii");
const VAULT_GCM_IV_BYTES = 12;
const VAULT_GCM_TAG_BYTES = 16;
const PUBLIC_SAMPLE_KEY = "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET";

function resolveVaultDirectory(options = {}) {
	if (options.vaultDir) return path.resolve(options.vaultDir);
	if (options.userDataDir) return path.join(options.userDataDir, "backups");
	return path.resolve(process.cwd(), ".dente-desktop-backups");
}

function resolveVaultEncryptionKey(options = {}) {
	const raw = String(
		options.encryptionKey || process.env.CLINIC_ENCRYPTION_KEY || "",
	).trim();
	if (!raw || raw === PUBLIC_SAMPLE_KEY) {
		return {
			error:
				"CLINIC_ENCRYPTION_KEY не задан: нешифрованные резервные копии медицинских данных запрещены.",
		};
	}
	const keyBytes = Buffer.from(raw, "utf8");
	if (keyBytes.length < 32) {
		return {
			error: "CLINIC_ENCRYPTION_KEY короче 32 байт: шифрование резервной копии отклонено.",
		};
	}
	const key =
		keyBytes.length === 32
			? keyBytes
			: crypto.createHash("sha256").update(keyBytes).digest();
	return { key };
}

async function listVaultBackups(options = {}) {
	const vaultDir = resolveVaultDirectory(options);
	if (!fs.existsSync(vaultDir)) return [];

	const entries = await fs.promises.readdir(vaultDir, { withFileTypes: true });
	const backups = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		if (!/\.(dente|dentalbackup|sql\.gz\.enc|sql\.gz|dump|bak)$/i.test(entry.name)) continue;
		const fullPath = path.join(vaultDir, entry.name);
		const stat = await fs.promises.stat(fullPath);
		backups.push({
			fileName: entry.name,
			filePath: fullPath,
			sizeBytes: stat.size,
			createdAt: stat.mtime.toISOString(),
		});
	}
	backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
	return backups;
}

async function pruneVaultBackups(vaultDir, maxBackups = 14) {
	const files = await listVaultBackups({ vaultDir });
	const removed = [];
	for (const item of files.slice(Math.max(1, maxBackups))) {
		await fs.promises.unlink(item.filePath);
		removed.push(item.fileName);
	}
	return removed;
}

async function triggerApiBackup(apiBaseUrl, authToken, timeoutMs = 15000) {
	const resolvedBaseUrl =
		typeof apiBaseUrl === "function" ? apiBaseUrl() : apiBaseUrl;
	const resolvedToken =
		typeof authToken === "function" ? authToken() : authToken;
	if (!resolvedBaseUrl || !resolvedToken) {
		return { ok: false, skipped: true, reason: "API URL or staff token not configured" };
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	if (typeof timer.unref === "function") timer.unref();

	try {
		const res = await fetch(
			`${String(resolvedBaseUrl).replace(/\/+$/, "")}/api/settings/backup/create`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${resolvedToken}`,
					"x-dente-staff-token": resolvedToken,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
				signal: controller.signal,
			},
		);
		if (!res.ok) {
			return { ok: false, status: res.status, error: `HTTP ${res.status}` };
		}
		const data = await res.json();
		return { ok: true, mode: "api", data };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}

async function runPgDumpStreamBackup(options = {}) {
	const keyResult = resolveVaultEncryptionKey(options);
	if ("error" in keyResult) {
		return {
			success: false,
			mode: "pg_dump",
			error: keyResult.error,
		};
	}

	const vaultDir = resolveVaultDirectory(options);
	await fs.promises.mkdir(vaultDir, { recursive: true });

	const pgDumpBin = options.pgDumpPath || process.env.DENTE_PG_DUMP_BIN || "pg_dump";
	const host = options.pgHost || process.env.DENTE_PG_HOST || "127.0.0.1";
	const port = String(options.pgPort || process.env.DENTE_PG_PORT || "5432");
	const database = options.pgDatabase || process.env.DENTE_PG_DATABASE || "dental_crm";
	const user = options.pgUser || process.env.DENTE_PG_USER || "dental";
	const password =
		options.pgPassword || process.env.DENTE_PG_PASSWORD || process.env.PGPASSWORD || "";

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const fileName = `dente-pg18-${stamp}.sql.gz.enc`;
	const outPath = path.join(vaultDir, fileName);

	const iv = crypto.randomBytes(VAULT_GCM_IV_BYTES);
	const cipher = crypto.createCipheriv("aes-256-gcm", keyResult.key, iv);
	const childEnv = { ...process.env };
	if (password) {
		childEnv.PGPASSWORD = password;
	}

	const spawnFn = typeof options.spawnFn === "function" ? options.spawnFn : spawn;

	return await new Promise((resolve) => {
		const child = spawnFn(
			pgDumpBin,
			["-h", host, "-p", port, "-U", user, "-d", database, "--no-owner", "--no-privileges"],
			{
				env: childEnv,
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			},
		);

		let stderr = "";
		child.stderr.on("data", (chunk) => {
			if (stderr.length < 4096) stderr += chunk.toString("utf8");
		});

		const gzip = zlib.createGzip({ level: 6 });
		const outStream = fs.createWriteStream(outPath, { mode: 0o600 });
		outStream.write(Buffer.concat([VAULT_MAGIC, iv]));

		const sink = new Writable({
			write(chunk, _encoding, callback) {
				if (!outStream.write(chunk)) {
					outStream.once("drain", callback);
				} else {
					callback();
				}
			},
		});

		const pipePromise = (async () => {
			await pipeline(child.stdout, gzip, cipher, sink);
			const authTag = cipher.getAuthTag();
			await new Promise((res, rej) => {
				outStream.once("error", rej);
				outStream.end(authTag, res);
			});
		})();

		child.on("error", async (err) => {
			outStream.destroy();
			try {
				await fs.promises.unlink(outPath);
			} catch (unlinkErr) {
				logger.debug("Cleanup of failed pg_dump output skipped", unlinkErr);
			}
			resolve({
				success: false,
				mode: "pg_dump",
				error: `pg_dump unavailable (${err.message})`,
			});
		});

		child.on("close", async (code) => {
			let pipeError = null;
			try {
				await pipePromise;
			} catch (pipeErr) {
				pipeError = pipeErr;
				logger.warn("Backup stream pipeline error", pipeErr);
			}
			if (code !== 0 || pipeError) {
				outStream.destroy();
				try {
					await fs.promises.unlink(outPath);
				} catch (unlinkErr) {
					logger.debug("Cleanup of non-zero pg_dump output skipped", unlinkErr);
				}
				return resolve({
					success: false,
					mode: "pg_dump",
					exitCode: code,
					error:
						(pipeError instanceof Error ? pipeError.message : null) ||
						stderr.trim() ||
						`pg_dump exited with code ${code}`,
				});
			}

			const stat = await fs.promises.stat(outPath);
			const pruned = await pruneVaultBackups(vaultDir, options.maxBackups || 14);
			resolve({
				success: true,
				mode: "pg_dump",
				encryption: "aes-256-gcm",
				filePath: outPath,
				fileName,
				sizeBytes: stat.size,
				pruned,
				createdAt: new Date().toISOString(),
			});
		});
	});
}

function createAutoBackupScheduler(options = {}) {
	let intervalHandle = null;
	const intervalMs = Math.max(60_000, Number(options.intervalMs || 6 * 60 * 60 * 1000));

	return {
		start() {
			if (intervalHandle) return;
			intervalHandle = setInterval(() => {
				void runVaultBackupCycle(options).catch((err) => {
					logger.warn("Scheduled backup vault cycle failed", err);
				});
			}, intervalMs);
			if (typeof intervalHandle.unref === "function") {
				intervalHandle.unref();
			}
		},
		stop() {
			if (intervalHandle) {
				clearInterval(intervalHandle);
				intervalHandle = null;
			}
		},
	};
}

async function runVaultBackupCycle(options = {}) {
	const resolvedBaseUrl =
		typeof options.apiBaseUrl === "function"
			? options.apiBaseUrl()
			: options.apiBaseUrl;
	const resolvedToken =
		typeof options.authToken === "function"
			? options.authToken()
			: options.authToken;
	if (resolvedBaseUrl && resolvedToken) {
		const apiRes = await triggerApiBackup(resolvedBaseUrl, resolvedToken);
		if (apiRes.ok) {
			return { success: true, mode: "api", details: apiRes.data };
		}
	}
	return await runPgDumpStreamBackup(options);
}

module.exports = {
	VAULT_MAGIC,
	VAULT_GCM_IV_BYTES,
	VAULT_GCM_TAG_BYTES,
	resolveVaultDirectory,
	resolveVaultEncryptionKey,
	listVaultBackups,
	pruneVaultBackups,
	triggerApiBackup,
	runPgDumpStreamBackup,
	runVaultBackupCycle,
	createAutoBackupScheduler,
};
