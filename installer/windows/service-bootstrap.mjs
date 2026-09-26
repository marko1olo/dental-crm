/**
 * DENTE Dental CRM — Production Windows Service Bootstrap Engine
 *
 * Executed by WinSW v3.0 x64 under LocalSystem in Session 0.
 * Responsibilities:
 * 1. Invokes db-preflight.ps1 to purge stale postmaster.pid after blackouts,
 *    detect port 5432/5438 conflicts, and start PostgreSQL 18.
 * 2. Loads environment variables from C:\ProgramData\DenteCRM\dente.env.
 * 3. Starts Fastify API server and binds HTTP/WebSocket on port 4000.
 * 4. Serves the precompiled React 19 SPA frontend from web/dist.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "..");

const dataDir = process.env.DENTE_DATA_DIR || "C:\\ProgramData\\DenteCRM\\data";
const configDir = process.env.DENTE_CONFIG_DIR || "C:\\ProgramData\\DenteCRM";
const envFilePath = process.env.DENTE_ENV_FILE || path.join(configDir, "dente.env");
const preflightScript = path.join(__dirname, "db-preflight.ps1");

console.log("[DENTE Bootstrap] Starting DENTE Dental CRM Service in Session 0...");
console.log(`[DENTE Bootstrap] Base Dir: ${baseDir}`);
console.log(`[DENTE Bootstrap] Data Dir: ${dataDir}`);
console.log(`[DENTE Bootstrap] Config:   ${envFilePath}`);

// ----------------------------------------------------------------------------
// 1. EXECUTE POSTGRESQL PREFLIGHT & CRASH RECOVERY
// ----------------------------------------------------------------------------
if (fs.existsSync(preflightScript)) {
	console.log("[DENTE Bootstrap] Executing PostgreSQL preflight audit...");
	try {
		const stdout = execFileSync(
			"powershell.exe",
			[
				"-NoProfile",
				"-ExecutionPolicy",
				"Bypass",
				"-File",
				preflightScript,
				"-DataDir",
				path.join(dataDir, "pg18"),
				"-EnvFile",
				envFilePath,
				"-StartPostgres",
			],
			{ encoding: "utf8", timeout: 60000 },
		);
		console.log(`[DENTE Bootstrap] Preflight output:\n${stdout}`);
	} catch (err) {
		console.error(`[DENTE Bootstrap] Preflight execution failed: ${err.message}`);
		if (err.stdout) console.error(`Preflight stdout: ${err.stdout}`);
		if (err.stderr) console.error(`Preflight stderr: ${err.stderr}`);
		process.exit(1);
	}
} else {
	console.warn(`[DENTE Bootstrap] Warning: preflight script not found at ${preflightScript}`);
}

// ----------------------------------------------------------------------------
// 2. LOAD ENVIRONMENT CONFIGURATION
// ----------------------------------------------------------------------------
if (fs.existsSync(envFilePath)) {
	console.log(`[DENTE Bootstrap] Loading environment from ${envFilePath}`);
	const envRaw = fs.readFileSync(envFilePath, "utf8");
	for (const line of envRaw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx > 0) {
			const key = trimmed.slice(0, eqIdx).trim();
			const val = trimmed.slice(eqIdx + 1).trim();
			if (!process.env[key]) {
				process.env[key] = val;
			}
		}
	}
}

// Ensure mandatory defaults for production
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "4000";
process.env.API_PORT = process.env.API_PORT || "4000";
process.env.API_HOST = process.env.API_HOST || "0.0.0.0";
process.env.WEB_ORIGIN =
	process.env.WEB_ORIGIN ||
	`http://localhost:${process.env.PORT},http://127.0.0.1:${process.env.PORT}`;

// ----------------------------------------------------------------------------
// 3. START FASTIFY API SERVER & STATIC CLIENT
// ----------------------------------------------------------------------------
async function startService() {
	const serverModulePath = path.join(baseDir, "server", "dist", "server.js");
	const webDistPath = path.join(baseDir, "web");

	console.log(`[DENTE Bootstrap] Loading API Server from ${serverModulePath}...`);

	if (fs.existsSync(serverModulePath)) {
		const { startDenteApiServer } = await import(
			path.isAbsolute(serverModulePath)
				? `file:///${serverModulePath.replace(/\\/g, "/")}`
				: serverModulePath
		);
		await startDenteApiServer();
		console.log(`[DENTE Bootstrap] DENTE API successfully listening on port ${process.env.PORT}`);
	} else {
		console.error(`[DENTE Bootstrap] Fatal: API binary not found at ${serverModulePath}`);
		process.exit(1);
	}
}

startService().catch((err) => {
	console.error("[DENTE Bootstrap] Unhandled fatal error during service startup:", err);
	process.exit(1);
});
