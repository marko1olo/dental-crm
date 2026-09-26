/**
 * DENTE Dental CRM — Production macOS Service Bootstrap Engine
 *
 * Supervised by macOS launchd (com.dente.crm.plist).
 * Responsibilities:
 * 1. Sets process.chdir(baseDir) to ensure correct working directory.
 * 2. Loads environment variables from ~/Library/Application Support/DenteCRM/dente.env.
 * 3. Starts Fastify API server on port 4000 (or PORT from env).
 * 4. Serves precompiled React 19 SPA frontend with client-side routing fallback.
 * 5. Handles graceful shutdown on SIGINT/SIGTERM.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory resolution: support running from repository root or installed app root
let baseDir = path.resolve(__dirname, "../..");
if (!fs.existsSync(path.join(baseDir, "apps", "api")) && fs.existsSync(path.resolve(__dirname, "..", "server"))) {
	baseDir = path.resolve(__dirname, "..");
}

try {
	process.chdir(baseDir);
	console.log(`[DENTE macOS Bootstrap] Working directory set to ${baseDir}`);
} catch (chdirErr) {
	console.error(`[DENTE macOS Bootstrap] Warning: failed to chdir to ${baseDir}:`, chdirErr);
}

const homeDir = process.env.HOME || "/Users/" + (process.env.USER || "default");
const appSupportDir =
	process.env.DENTE_APP_SUPPORT || path.join(homeDir, "Library", "Application Support", "DenteCRM");
const dataDir = process.env.DENTE_DATA_DIR || path.join(appSupportDir, "data");
const envFilePath = process.env.DENTE_ENV_FILE || path.join(appSupportDir, "dente.env");
const preflightScript = path.join(__dirname, "db-preflight.sh");

console.log("[DENTE macOS Bootstrap] Initializing DENTE Dental CRM on macOS...");
console.log(`[DENTE macOS Bootstrap] Base Dir:    ${baseDir}`);
console.log(`[DENTE macOS Bootstrap] App Support: ${appSupportDir}`);
console.log(`[DENTE macOS Bootstrap] Config:      ${envFilePath}`);

// ----------------------------------------------------------------------------
// 1. RUN PREFLIGHT AUDIT BEFORE SERVING
// ----------------------------------------------------------------------------
if (fs.existsSync(preflightScript)) {
	console.log("[DENTE macOS Bootstrap] Invoking db-preflight.sh...");
	try {
		const stdout = execFileSync("bash", [preflightScript, "--start", "--env-file", envFilePath], {
			encoding: "utf8",
			timeout: 60000,
		});
		console.log(`[DENTE macOS Bootstrap] Preflight output:\n${stdout}`);
	} catch (err) {
		console.error(`[DENTE macOS Bootstrap] Warning: preflight audit returned: ${err.message}`);
		if (err.stdout) console.log(err.stdout);
		if (err.stderr) console.error(err.stderr);
	}
}

// ----------------------------------------------------------------------------
// 2. LOAD ENVIRONMENT CONFIGURATION
// ----------------------------------------------------------------------------
if (fs.existsSync(envFilePath)) {
	console.log(`[DENTE macOS Bootstrap] Loading configuration from ${envFilePath}`);
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

// Mandatory defaults
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "4000";
process.env.API_PORT = process.env.API_PORT || "4000";
process.env.API_HOST = process.env.API_HOST || "0.0.0.0";
process.env.WEB_ORIGIN =
	process.env.WEB_ORIGIN ||
	`http://localhost:${process.env.PORT},http://127.0.0.1:${process.env.PORT},http://dente-clinic.local:${process.env.PORT}`;

// ----------------------------------------------------------------------------
// 3. MIME TYPES FOR STATIC ASSETS
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
// 4. FIND COMPILED BUNDLES (API & WEB)
// ----------------------------------------------------------------------------
function resolveServerModulePath() {
	const candidates = [
		path.join(baseDir, "apps", "api", "dist", "server.js"),
		path.join(baseDir, "server", "dist", "server.js"),
		path.join(baseDir, "server", "server.js"),
	];
	for (const cand of candidates) {
		if (fs.existsSync(cand)) return cand;
	}
	return null;
}

function resolveWebDistPath() {
	const candidates = [
		path.join(baseDir, "apps", "web", "dist"),
		path.join(baseDir, "web", "dist"),
		path.join(baseDir, "web"),
	];
	for (const cand of candidates) {
		if (fs.existsSync(path.join(cand, "index.html"))) return cand;
	}
	return candidates[0];
}

// ----------------------------------------------------------------------------
// 5. START FASTIFY & REGISTER SPA STATIC FALLBACK
// ----------------------------------------------------------------------------
async function startService() {
	const serverModulePath = resolveServerModulePath();
	const webDistPath = resolveWebDistPath();

	if (!serverModulePath) {
		console.error("[DENTE macOS Bootstrap] Fatal: API binary not found. Run 'npm run build' first.");
		process.exit(1);
	}

	console.log(`[DENTE macOS Bootstrap] Loading API Server from ${serverModulePath}...`);
	const serverModule = await import(
		path.isAbsolute(serverModulePath)
			? `file://${serverModulePath}`
			: serverModulePath
	);

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
					"<h1>DENTE Dental CRM</h1><p>Клиентский веб-интерфейс не обнаружен. Соберите клиент: npm run build -w @dental/web</p>",
				);
		}

		const safeRelative = path.normalize(rawUrl).replace(/^(\.\.[/\\])+/, "");
		let targetPath = path.join(webDistPath, safeRelative);

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
	console.log(`[DENTE macOS Bootstrap] Server running at http://${host}:${port}`);
	console.log(`[DENTE macOS Bootstrap] Access locally at http://localhost:${port}`);

	const shutdown = async (signal) => {
		console.log(`[DENTE macOS Bootstrap] Received ${signal}. Stopping server cleanly...`);
		try {
			await app.close();
			console.log("[DENTE macOS Bootstrap] Server stopped cleanly.");
			process.exit(0);
		} catch (err) {
			console.error("[DENTE macOS Bootstrap] Error during shutdown:", err);
			process.exit(1);
		}
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startService().catch((err) => {
	console.error("[DENTE macOS Bootstrap] Unhandled fatal error:", err);
	process.exit(1);
});
