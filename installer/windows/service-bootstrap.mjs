/**
 * DENTE Dental CRM — Production Windows Service Bootstrap Engine
 *
 * Executed by WinSW v3.0 x64 under LocalSystem in Session 0.
 * Responsibilities:
 * 1. Sets process.chdir(baseDir) to prevent CWD defaulting to C:\Windows\System32.
 * 2. Invokes db-preflight.ps1 to purge stale postmaster.pid after blackouts,
 *    resolve port 5432/5438 conflicts, verify dental_crm database, and start PostgreSQL 18.
 * 3. Loads environment variables from C:\ProgramData\DenteCRM\dente.env.
 * 4. Starts Fastify API server on port 4000.
 * 5. Serves precompiled React 19 SPA frontend with client-side routing fallback.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "..");

// ----------------------------------------------------------------------------
// 1. FIX SESSION 0 WORKING DIRECTORY (DEFECT 2)
// ----------------------------------------------------------------------------
try {
	process.chdir(baseDir);
	console.log(`[DENTE Bootstrap] CWD successfully set to ${baseDir}`);
} catch (chdirErr) {
	console.error(`[DENTE Bootstrap] Warning: failed to chdir to ${baseDir}:`, chdirErr);
}

const dataDir = process.env.DENTE_DATA_DIR || "C:\\ProgramData\\DenteCRM\\data";
const configDir = process.env.DENTE_CONFIG_DIR || "C:\\ProgramData\\DenteCRM";
const envFilePath = process.env.DENTE_ENV_FILE || path.join(configDir, "dente.env");
const preflightScript = path.join(__dirname, "db-preflight.ps1");

console.log("[DENTE Bootstrap] Starting DENTE Dental CRM Service in Session 0...");
console.log(`[DENTE Bootstrap] Base Dir: ${baseDir}`);
console.log(`[DENTE Bootstrap] Data Dir: ${dataDir}`);
console.log(`[DENTE Bootstrap] Config:   ${envFilePath}`);

// ----------------------------------------------------------------------------
// 2. EXECUTE POSTGRESQL PREFLIGHT & CRASH RECOVERY
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
			{ encoding: "utf8", timeout: 90000 },
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
// 3. LOAD ENVIRONMENT CONFIGURATION
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
// 4. MIME TYPE DICTIONARY FOR SPA STATIC ASSETS (DEFECT 5)
// ----------------------------------------------------------------------------
const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".mjs": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".wasm": "application/wasm",
	".txt": "text/plain; charset=utf-8",
};

// ----------------------------------------------------------------------------
// 5. START FASTIFY SERVER & REGISTER SPA STATIC SERVING (DEFECT 5)
// ----------------------------------------------------------------------------
async function startService() {
	const serverModulePath = path.join(baseDir, "server", "dist", "server.js");
	const webDistPath = path.join(baseDir, "web");

	console.log(`[DENTE Bootstrap] Loading API Server from ${serverModulePath}...`);

	if (!fs.existsSync(serverModulePath)) {
		console.error(`[DENTE Bootstrap] Fatal: API binary not found at ${serverModulePath}`);
		process.exit(1);
	}

	const serverModule = await import(
		path.isAbsolute(serverModulePath)
			? `file:///${serverModulePath.replace(/\\/g, "/")}`
			: serverModulePath
	);

	// Create Fastify app instance
	const app = await serverModule.createDenteApiApp();

	// Register Static Web SPA Serving into Fastify
	app.setNotFoundHandler(async (request, reply) => {
		const rawUrl = request.url.split("?")[0];

		// If route is explicitly an API or WebSocket route, return 404 JSON
		if (rawUrl.startsWith("/api/") || rawUrl === "/api") {
			return reply.code(404).send({
				error: "RouteNotFound",
				message: "Маршрут API не найден на сервере клиники.",
			});
		}

		// Only GET and HEAD methods are valid for static assets
		if (request.method !== "GET" && request.method !== "HEAD") {
			return reply.code(405).send({
				error: "MethodNotAllowed",
				message: "Статические файлы поддерживают только методы GET и HEAD.",
			});
		}

		if (!fs.existsSync(webDistPath)) {
			return reply
				.code(503)
				.type("text/html; charset=utf-8")
				.send(
					"<h1>DENTE Dental CRM</h1><p>Клиентский веб-интерфейс не обнаружен в папке web/. Соберите клиент: npm run build -w @dental/web</p>",
				);
		}

		// Sanitize path to prevent directory traversal
		const safeRelative = path.normalize(rawUrl).replace(/^(\.\.[/\\])+/, "");
		let targetPath = path.join(webDistPath, safeRelative);

		// Ensure target path stays strictly inside webDistPath
		if (!targetPath.startsWith(webDistPath)) {
			targetPath = path.join(webDistPath, "index.html");
		}

		let fileStat = null;
		try {
			if (fs.existsSync(targetPath)) {
				fileStat = fs.statSync(targetPath);
				if (fileStat.isDirectory()) {
					targetPath = path.join(targetPath, "index.html");
					if (fs.existsSync(targetPath)) {
						fileStat = fs.statSync(targetPath);
					} else {
						fileStat = null;
					}
				}
			}
		} catch {
			fileStat = null;
		}

		// SPA Client-side routing fallback: If file not found, serve index.html
		const isSpaFallback = !fileStat;
		const finalPath = isSpaFallback ? path.join(webDistPath, "index.html") : targetPath;

		if (!fs.existsSync(finalPath)) {
			return reply.code(404).type("text/html; charset=utf-8").send(
				"<h1>404 Not Found</h1><p>Файл index.html не найден в каталоге веб-интерфейса.</p>",
			);
		}

		const ext = path.extname(finalPath).toLowerCase();
		const contentType = MIME_TYPES[ext] || "application/octet-stream";

		if (rawUrl.startsWith("/assets/") && !isSpaFallback) {
			reply.header("Cache-Control", "public, max-age=31536000, immutable");
		} else {
			reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
		}

		reply.type(contentType);
		const stream = fs.createReadStream(finalPath);
		return reply.send(stream);
	});

	const host = process.env.API_HOST || "0.0.0.0";
	const port = Number(process.env.PORT || 4000);

	await app.listen({ host, port });
	console.log(`[DENTE Bootstrap] DENTE Dental CRM Server successfully running at http://${host}:${port}`);

	// Register graceful shutdown
	const shutdown = async (signal) => {
		console.log(`[DENTE Bootstrap] Received ${signal}. Draining connections and shutting down...`);
		try {
			await app.close();
			console.log("[DENTE Bootstrap] HTTP server closed cleanly.");
			process.exit(0);
		} catch (err) {
			console.error("[DENTE Bootstrap] Error during shutdown:", err);
			process.exit(1);
		}
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startService().catch((err) => {
	console.error("[DENTE Bootstrap] Unhandled fatal error during service startup:", err);
	process.exit(1);
});
