/**
 * DENTE Dental CRM — Loopback HTTP Server (`http://127.0.0.1:<port>`)
 *
 * Serves `apps/web/dist` via streaming I/O and proxies `/api/*` + `/health*`
 * to the clinic Fastify API over a real HTTP origin (never `file://`).
 */

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("LoopbackHttpServer");

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
	".woff": "font/woff",
	".woff2": "font/woff2",
	".wasm": "application/wasm",
	".map": "application/json; charset=utf-8",
};

function proxyRequestToApi(req, res, targetApiBaseUrl) {
	let target;
	try {
		target = new URL(req.url || "/", targetApiBaseUrl);
	} catch (err) {
		res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ ok: false, error: "INVALID_PROXY_URL", message: err.message }));
		return;
	}

	const headers = { ...req.headers, host: target.host, connection: "close" };
	const proxyReq = http.request(
		{
			hostname: target.hostname,
			port: target.port || (target.protocol === "https:" ? 443 : 80),
			path: `${target.pathname}${target.search}`,
			method: req.method,
			headers,
			timeout: 15000,
		},
		(proxyRes) => {
			res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
			proxyRes.pipe(res);
		},
	);

	proxyReq.on("timeout", () => {
		proxyReq.destroy(new Error("Upstream API request timed out"));
	});

	proxyReq.on("error", (err) => {
		if (!res.headersSent) {
			res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
		}
		res.end(
			JSON.stringify({
				ok: false,
				error: "LOCAL_API_UNREACHABLE",
				message: `Локальный сервер API (${targetApiBaseUrl}) недоступен: ${err.message}`,
			}),
		);
	});

	req.pipe(proxyReq);
}

function serveStaticAsset(req, res, webDistDir) {
	const rawPath = (req.url || "/").split("?")[0];
	let decoded;
	try {
		decoded = decodeURIComponent(rawPath);
	} catch (err) {
		logger.warn("Malformed URI in loopback static handler", { rawPath, error: err instanceof Error ? err.message : String(err) });
		res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Bad Request");
		return;
	}

	if (decoded.split(/[\\/]/).includes("..")) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Forbidden");
		return;
	}

	const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
	const resolvedRoot = path.resolve(webDistDir);
	let targetFile = path.resolve(resolvedRoot, relativePath);
	const relCheck = path.relative(resolvedRoot, targetFile);
	if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Forbidden");
		return;
	}

	const isAssetPath = decoded.startsWith("/assets/");
	if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
		if (isAssetPath) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Asset not found");
			return;
		}
		targetFile = path.join(resolvedRoot, "index.html");
	}

	if (!fs.existsSync(targetFile)) {
		res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
		res.end("<h1>DENTE Desktop: Web bundle not built</h1><p>Run npm run build -w @dental/web</p>");
		return;
	}

	const ext = path.extname(targetFile).toLowerCase();
	const contentType = MIME_TYPES[ext] || "application/octet-stream";
	const cacheControl =
		ext === ".html"
			? "no-cache, no-store, must-revalidate"
			: isAssetPath
				? "public, max-age=31536000, immutable"
				: "public, max-age=3600";

	res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
	const stream = fs.createReadStream(targetFile);
	stream.on("error", (err) => {
		logger.error("Static asset stream failed", { targetFile, error: err.message });
		if (!res.headersSent) res.writeHead(500);
		res.end();
	});
	stream.pipe(res);
}

function createLoopbackServer({ webDistDir, getApiBaseUrl }) {
	return http.createServer((req, res) => {
		const reqUrl = req.url || "/";
		if (reqUrl.startsWith("/api/") || reqUrl === "/api" || reqUrl.startsWith("/health")) {
			proxyRequestToApi(req, res, getApiBaseUrl());
			return;
		}
		serveStaticAsset(req, res, webDistDir);
	});
}

module.exports = {
	createLoopbackServer,
	proxyRequestToApi,
	serveStaticAsset,
};
