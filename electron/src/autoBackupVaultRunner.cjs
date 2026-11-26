/**
 * DENTE Dental CRM — Automated Local PG18 Backup Vault Runner
 *
 * Triggers encrypted tenant backups via the local API or streams pg_dump
 * into `userData/backups/` with bounded retention and non-blocking timers.
 */

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("AutoBackupVault");

function resolveVaultDirectory(options = {}) {
	if (options.vaultDir) return path.resolve(options.vaultDir);
	if (options.userDataDir) return path.join(options.userDataDir, "backups");
	return path.resolve(process.cwd(), ".dente-desktop-backups");
}

async function listVaultBackups(options = {}) {
	const vaultDir = resolveVaultDirectory(options);
	if (!fs.existsSync(vaultDir)) return [];

	const entries = await fs.promises.readdir(vaultDir, { withFileTypes: true });
	const backups = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		if (!/\.(dente|sql\.gz|dump|bak)$/i.test(entry.name)) continue;
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
	if (!apiBaseUrl || !authToken) {
		return { ok: false, skipped: true, reason: "API URL or staff token not configured" };
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	if (typeof timer.unref === "function") timer.unref();

	try {
		const res = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/api/settings/backup`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ source: "desktop_vault_scheduler" }),
			signal: controller.signal,
		});
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
	const vaultDir = resolveVaultDirectory(options);
	await fs.promises.mkdir(vaultDir, { recursive: true });

	const pgDumpBin = options.pgDumpPath || process.env.DENTE_PG_DUMP_BIN || "pg_dump";
	const host = options.pgHost || process.env.DENTE_PG_HOST || "127.0.0.1";
	const port = String(options.pgPort || process.env.DENTE_PG_PORT || "5432");
	const database = options.pgDatabase || process.env.DENTE_PG_DATABASE || "dental_crm";
	const user = options.pgUser || process.env.DENTE_PG_USER || "dental";
	const password = options.pgPassword || process.env.DENTE_PG_PASSWORD || "dental";

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const fileName = `dente-pg18-${stamp}.sql.gz`;
	const outPath = path.join(vaultDir, fileName);

	return await new Promise((resolve) => {
		const child = spawn(
			pgDumpBin,
			["-h", host, "-p", port, "-U", user, "-d", database, "--no-owner", "--no-privileges"],
			{
				env: { ...process.env, PGPASSWORD: password },
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			},
		);

		let stderr = "";
		child.stderr.on("data", (chunk) => {
			if (stderr.length < 4096) stderr += chunk.toString("utf8");
		});

		const gzip = zlib.createGzip({ level: 6 });
		const outStream = fs.createWriteStream(outPath);

		const pipePromise = pipeline(child.stdout, gzip, outStream);

		child.on("error", async (err) => {
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
			try {
				await pipePromise;
			} catch (pipeErr) {
				logger.warn("Backup stream pipeline error", pipeErr);
			}
			if (code !== 0) {
				try {
					await fs.promises.unlink(outPath);
				} catch (unlinkErr) {
					logger.debug("Cleanup of non-zero pg_dump output skipped", unlinkErr);
				}
				return resolve({
					success: false,
					mode: "pg_dump",
					exitCode: code,
					error: stderr.trim() || `pg_dump exited with code ${code}`,
				});
			}

			const stat = await fs.promises.stat(outPath);
			const pruned = await pruneVaultBackups(vaultDir, options.maxBackups || 14);
			resolve({
				success: true,
				mode: "pg_dump",
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
	if (options.apiBaseUrl && options.authToken) {
		const apiRes = await triggerApiBackup(options.apiBaseUrl, options.authToken);
		if (apiRes.ok) {
			return { success: true, mode: "api", details: apiRes.data };
		}
	}
	return await runPgDumpStreamBackup(options);
}

module.exports = {
	resolveVaultDirectory,
	listVaultBackups,
	pruneVaultBackups,
	runPgDumpStreamBackup,
	runVaultBackupCycle,
	createAutoBackupScheduler,
};
