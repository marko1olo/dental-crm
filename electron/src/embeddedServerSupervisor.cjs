/**
 * DENTE Dental CRM — Embedded Loopback HTTP Server, PG18 Supervisor & Runtime Config
 */

const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { setTimeout: delay } = require("node:timers/promises");
const { createDesktopLogger } = require("./desktopLogger.cjs");
const { resolveConfiguredClinicServerUrl } = require("./lanBeaconDesktopBridge.cjs");
const { createLoopbackServer } = require("./loopbackHttpServer.cjs");

const logger = createDesktopLogger("EmbeddedServerSupervisor");

const VALID_LOCAL_DB_MODES = new Set(["embedded-postgres", "postgres_native", "lan_client"]);
let activeLocalDbMode = "embedded-postgres";

const supervisorState = {
	server: null,
	loopbackPort: null,
	loopbackUrl: null,
	apiBaseUrl: null,
	webDistDir: null,
	runtimeConfigPath: null,
	pgInstance: null,
	apiChildProcess: null,
	pgDataDir: null,
	embeddedStatus: null,
};

function resolveDefaultWebDistDir() {
	const packagedDist = process.resourcesPath ? path.join(process.resourcesPath, "web", "dist") : null;
	if (packagedDist && fs.existsSync(path.join(packagedDist, "index.html"))) {
		return packagedDist;
	}
	return path.resolve(__dirname, "../../apps/web/dist");
}

function resolveDefaultApiEntryPath() {
	const packagedApi = process.resourcesPath ? path.join(process.resourcesPath, "api", "dist", "server.js") : null;
	if (packagedApi && fs.existsSync(packagedApi)) {
		return packagedApi;
	}
	const devApi = path.resolve(__dirname, "../../apps/api/dist/server.js");
	if (fs.existsSync(devApi)) {
		return devApi;
	}
	return null;
}

function shouldRunEmbeddedBackend({ argv = process.argv, env = process.env, runtimeConfig = {} } = {}) {
	if (env.DENTE_DISABLE_EMBEDDED_SERVER === "1") {
		return { enabled: false, reason: "disabled_by_env" };
	}
	if (Array.isArray(argv) && argv.includes("--remote")) {
		return { enabled: false, reason: "remote_cli_flag" };
	}
	if (typeof env.DENTE_API_URL === "string" && env.DENTE_API_URL.trim().length > 0) {
		return { enabled: false, reason: "external_api_url" };
	}
	if (typeof env.DENTE_WEB_URL === "string" && env.DENTE_WEB_URL.trim().length > 0) {
		return { enabled: false, reason: "external_web_url" };
	}
	if (resolveConfiguredClinicServerUrl(runtimeConfig)) {
		return { enabled: false, reason: "configured_clinic_server" };
	}
	const configuredEngine = runtimeConfig.engine || activeLocalDbMode;
	if (configuredEngine === "lan_client") {
		return { enabled: false, reason: "lan_client_mode" };
	}
	return { enabled: true, reason: "standalone" };
}

function readRuntimeConfig(runtimeConfigPath) {
	if (!runtimeConfigPath || !fs.existsSync(runtimeConfigPath)) return {};
	try {
		const parsed = JSON.parse(fs.readFileSync(runtimeConfigPath, "utf8"));
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (err) {
		logger.warn("Failed to parse runtime.json", {
			runtimeConfigPath,
			error: err instanceof Error ? err.message : String(err),
		});
		return {};
	}
}

function writeRuntimeConfig(runtimeConfigPath, patch) {
	if (!runtimeConfigPath) return null;
	try {
		const current = readRuntimeConfig(runtimeConfigPath);
		const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
		fs.mkdirSync(path.dirname(runtimeConfigPath), { recursive: true });
		fs.writeFileSync(runtimeConfigPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
		return next;
	} catch (err) {
		logger.warn("Failed to persist runtime.json", {
			runtimeConfigPath,
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

function resolveApiBaseUrl(options = {}, runtimeConfig = {}) {
	if (options.apiBaseUrl) return String(options.apiBaseUrl).replace(/\/+$/, "");
	const clinicUrl = resolveConfiguredClinicServerUrl(runtimeConfig);
	if (clinicUrl) return clinicUrl;
	const apiPort = Number(options.apiPort || runtimeConfig.apiPort || process.env.API_PORT || 4100);
	return `http://127.0.0.1:${apiPort}`;
}

async function startLoopbackHttpServer(options = {}) {
	if (supervisorState.server && supervisorState.loopbackUrl) {
		return {
			port: supervisorState.loopbackPort,
			url: supervisorState.loopbackUrl,
			apiBaseUrl: supervisorState.apiBaseUrl,
			runtimeConfigPath: supervisorState.runtimeConfigPath,
		};
	}

	const runtimeConfigPath = options.runtimeConfigPath || null;
	const existingConfig = readRuntimeConfig(runtimeConfigPath);
	const webDistDir = options.webDistDir || resolveDefaultWebDistDir();
	const apiBaseUrl = resolveApiBaseUrl(options, existingConfig);
	const requestedPort =
		options.port !== undefined
			? Number(options.port)
			: process.env.DENTE_DESKTOP_PORT !== undefined
				? Number(process.env.DENTE_DESKTOP_PORT)
				: Number(existingConfig.loopbackPort || 0);

	const server = createLoopbackServer({
		webDistDir,
		getApiBaseUrl: () => supervisorState.apiBaseUrl || apiBaseUrl,
	});

	const listenWithPort = (portToTry) =>
		new Promise((resolve, reject) => {
			server.once("error", reject);
			server.listen(portToTry, "127.0.0.1", () => {
				server.removeListener("error", reject);
				resolve(server.address());
			});
		});

	let addressInfo;
	try {
		addressInfo = await listenWithPort(Number.isFinite(requestedPort) ? requestedPort : 0);
	} catch (err) {
		if (requestedPort !== 0 && err && err.code === "EADDRINUSE") {
			logger.warn(`Loopback port ${requestedPort} is busy, falling back to ephemeral port`);
			addressInfo = await listenWithPort(0);
		} else {
			throw err;
		}
	}

	const port = typeof addressInfo === "object" && addressInfo ? addressInfo.port : 0;
	const url = `http://127.0.0.1:${port}`;

	supervisorState.server = server;
	supervisorState.loopbackPort = port;
	supervisorState.loopbackUrl = url;
	supervisorState.apiBaseUrl = apiBaseUrl;
	supervisorState.webDistDir = webDistDir;
	supervisorState.runtimeConfigPath = runtimeConfigPath;

	if (runtimeConfigPath) {
		writeRuntimeConfig(runtimeConfigPath, {
			loopbackPort: port,
			loopbackUrl: url,
			apiBaseUrl,
			engine: activeLocalDbMode,
		});
	}

	return { port, url, apiBaseUrl, runtimeConfigPath };
}

async function stopLoopbackHttpServer() {
	const srv = supervisorState.server;
	if (!srv) return;
	if (typeof srv.closeAllConnections === "function") srv.closeAllConnections();
	await new Promise((resolve) => {
		srv.close((err) => {
			if (err) logger.warn("Error closing loopback HTTP server", { error: err.message });
			resolve();
		});
	});
	supervisorState.server = null;
	supervisorState.loopbackPort = null;
	supervisorState.loopbackUrl = null;
}

function getLoopbackBaseUrl() {
	return supervisorState.loopbackUrl;
}

async function probePostgresTcpSocket(host = "127.0.0.1", port = 5432, timeoutMs = 250) {
	return new Promise((resolve) => {
		const start = Date.now();
		const socket = new net.Socket();
		let settled = false;

		const finish = (connected, latency) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve({ connected, latencyMs: latency, host, port });
		};

		socket.setTimeout(timeoutMs);
		socket.on("connect", () => finish(true, Math.max(1, Date.now() - start)));
		socket.on("timeout", () => finish(false, timeoutMs));
		socket.on("error", () => finish(false, Math.max(1, Date.now() - start)));

		try {
			socket.connect(port, host);
		} catch (err) {
			logger.debug("Postgres TCP socket connect threw synchronously", {
				host,
				port,
				error: err instanceof Error ? err.message : String(err),
			});
			finish(false, 0);
		}
	});
}

async function probeApiHealth(apiBaseUrl, timeoutMs = 400) {
	if (!apiBaseUrl) return { reachable: false, error: "API URL не задан" };
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	if (typeof timer.unref === "function") timer.unref();

	try {
		const res = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/api/health`, {
			method: "GET",
			signal: controller.signal,
		});
		return { reachable: res.ok, statusCode: res.status };
	} catch (err) {
		return { reachable: false, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}

async function inspectPgDataDirectory(pgDataDir) {
	if (!pgDataDir || !fs.existsSync(pgDataDir)) {
		return { exists: false, pgVersion: null };
	}
	let pgVersion = null;
	try {
		const verPath = path.join(pgDataDir, "PG_VERSION");
		if (fs.existsSync(verPath)) pgVersion = fs.readFileSync(verPath, "utf8").trim();
	} catch (err) {
		logger.debug("Could not read PG_VERSION", { pgDataDir, error: err instanceof Error ? err.message : String(err) });
	}
	return { exists: true, pgVersion };
}

async function ensureManagedPostgresStarted(options = {}) {
	const pgHost = options.pgHost || process.env.DENTE_PG_HOST || "127.0.0.1";
	const pgPort = Number.parseInt(String(options.pgPort || process.env.DENTE_PG_PORT || "5432"), 10) || 5432;
	const existingProbe = await probePostgresTcpSocket(pgHost, pgPort, 250);
	if (existingProbe.connected) return { started: true, external: true, port: pgPort };

	const pgDataDir = options.pgDataDir || (options.userDataDir ? path.join(options.userDataDir, "pgdata") : null);
	if (!pgDataDir) return { started: false, reason: "PGDATA path not specified" };

	try {
		const EmbeddedPostgresMod = require("embedded-postgres");
		const EmbeddedPostgres = EmbeddedPostgresMod.default || EmbeddedPostgresMod;
		const pg = new EmbeddedPostgres({
			databaseDir: pgDataDir,
			user: process.env.DENTE_PG_USER || "postgres",
			password: process.env.DENTE_PG_PASSWORD || "postgres",
			database: process.env.DENTE_PG_DATABASE || "dental_crm",
			port: pgPort,
			initdbFlags: ["--encoding=UTF8", "--locale=C"],
		});
		if (!fs.existsSync(path.join(pgDataDir, "PG_VERSION"))) await pg.initialise();
		await pg.start();
		supervisorState.pgInstance = pg;
		supervisorState.pgDataDir = pgDataDir;
		activeLocalDbMode = "embedded-postgres";
		return { started: true, external: false, port: pgPort, pgDataDir };
	} catch (err) {
		logger.warn("Managed embedded-postgres start skipped or failed", {
			error: err instanceof Error ? err.message : String(err),
		});
		return { started: false, error: err instanceof Error ? err.message : String(err) };
	}
}

async function ensureManagedApiStarted(options = {}) {
	const runtimeConfig = options.runtimeConfig ?? readRuntimeConfig(options.runtimeConfigPath);
	const apiBaseUrl = options.apiBaseUrl || supervisorState.apiBaseUrl || resolveApiBaseUrl(options, runtimeConfig);
	const existingHealth = await probeApiHealth(apiBaseUrl, 300);
	if (existingHealth.reachable) {
		return { started: true, external: true, apiBaseUrl };
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(apiBaseUrl);
	} catch (err) {
		return { started: false, apiBaseUrl, reason: err instanceof Error ? err.message : String(err) };
	}
	if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
		return { started: false, skipped: true, apiBaseUrl, reason: "remote_api_host" };
	}

	const runningChild = supervisorState.apiChildProcess;
	if (runningChild && !runningChild.killed && runningChild.exitCode === null) {
		return { started: true, external: false, pid: runningChild.pid ?? null, apiBaseUrl };
	}

	const apiEntryPath = options.apiEntryPath || resolveDefaultApiEntryPath();
	if (!apiEntryPath || !fs.existsSync(apiEntryPath)) {
		return { started: false, apiBaseUrl, reason: "API server bundle not found" };
	}

	const apiPort = parsedUrl.port || "4100";
	const spawnFn = typeof options.spawnFn === "function" ? options.spawnFn : spawn;
	const childEnv = {
		...process.env,
		ELECTRON_RUN_AS_NODE: "1",
		API_PORT: String(apiPort),
		...(options.pgPort ? { DENTE_PG_PORT: String(options.pgPort) } : {}),
		...(options.env || {}),
	};

	let earlyExitInfo = null;
	try {
		const child = spawnFn(
			options.nodeExecPath || process.execPath,
			["--max-old-space-size=1536", apiEntryPath],
			{
				env: childEnv,
				cwd: path.dirname(apiEntryPath),
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			},
		);
		supervisorState.apiChildProcess = child;

		if (child.stderr && typeof child.stderr.on === "function") {
			child.stderr.on("data", (chunk) => {
				const text = String(chunk).trim();
				if (text) logger.warn("Managed API stderr", { text: text.slice(0, 400) });
			});
		}
		if (typeof child.on === "function") {
			child.on("error", (err) => {
				earlyExitInfo = err instanceof Error ? err.message : String(err);
				logger.warn("Managed API process error", { error: earlyExitInfo });
			});
			child.on("exit", (code, signal) => {
				if (supervisorState.apiChildProcess === child) {
					supervisorState.apiChildProcess = null;
				}
				earlyExitInfo = `exited (code=${code ?? "null"}, signal=${signal ?? "null"})`;
				logger.info("Managed API process stopped", { code, signal });
			});
		}

		const timeoutMs = Number.isFinite(options.startupTimeoutMs) ? Math.max(0, options.startupTimeoutMs) : 3000;
		const deadline = Date.now() + timeoutMs;
		while (Date.now() <= deadline) {
			if (earlyExitInfo) {
				return { started: false, external: false, pid: null, apiBaseUrl, reason: earlyExitInfo };
			}
			const health = await probeApiHealth(apiBaseUrl, 250);
			if (health.reachable) {
				return { started: true, external: false, pid: child.pid ?? null, apiBaseUrl };
			}
			if (Date.now() >= deadline) break;
			await delay(150, undefined, { ref: false });
		}

		return {
			started: false,
			external: false,
			pid: child.pid ?? null,
			apiBaseUrl,
			reason: earlyExitInfo || "API startup health timeout",
		};
	} catch (err) {
		return {
			started: false,
			external: false,
			apiBaseUrl,
			reason: err instanceof Error ? err.message : String(err),
		};
	}
}

async function ensureEmbeddedBackendStarted(options = {}) {
	const runtimeConfigPath = options.runtimeConfigPath || supervisorState.runtimeConfigPath || null;
	const runtimeConfig = options.runtimeConfig ?? readRuntimeConfig(runtimeConfigPath);
	const decision = shouldRunEmbeddedBackend({
		argv: options.argv || process.argv,
		env: options.env || process.env,
		runtimeConfig,
	});

	if (!decision.enabled) {
		const skippedStatus = {
			mode: "remote_or_disabled",
			reason: decision.reason,
			pg: { started: false, skipped: true, reason: decision.reason },
			api: { started: false, skipped: true, reason: decision.reason },
		};
		supervisorState.embeddedStatus = skippedStatus;
		logger.info("Embedded PG/API startup skipped", { reason: decision.reason });
		return skippedStatus;
	}

	const pgResult = await ensureManagedPostgresStarted({
		userDataDir: options.userDataDir,
		pgDataDir: options.pgDataDir,
		pgHost: options.pgHost,
		pgPort: options.pgPort,
	});

	const apiBaseUrl = options.apiBaseUrl || supervisorState.apiBaseUrl || resolveApiBaseUrl(options, runtimeConfig);
	let apiResult;
	if (pgResult.started || options.startApiWithoutPg) {
		apiResult = await ensureManagedApiStarted({
			...options,
			runtimeConfig,
			apiBaseUrl,
		});
	} else {
		const health = await probeApiHealth(apiBaseUrl, 300);
		apiResult = health.reachable
			? { started: true, external: true, apiBaseUrl }
			: { started: false, skipped: true, apiBaseUrl, reason: pgResult.error || pgResult.reason || "postgres_unavailable" };
	}

	const status = {
		mode: "standalone",
		reason: "standalone",
		pg: pgResult,
		api: apiResult,
	};
	supervisorState.embeddedStatus = status;
	return status;
}

async function stopManagedServices() {
	await stopLoopbackHttpServer();
	const child = supervisorState.apiChildProcess;
	if (child) {
		supervisorState.apiChildProcess = null;
		if (child.exitCode === null && !child.killed) {
			try {
				child.kill("SIGTERM");
				await once(child, "exit", { signal: AbortSignal.timeout(1000) });
			} catch (err) {
				logger.debug("Managed API child did not exit cleanly on SIGTERM, escalating", {
					error: err instanceof Error ? err.message : String(err),
				});
				if (child.exitCode === null) {
					try {
						child.kill("SIGKILL");
					} catch (killErr) {
						logger.warn("Failed to force-kill managed API child process", killErr);
					}
				}
			}
		}
	}
	if (supervisorState.pgInstance) {
		try {
			await supervisorState.pgInstance.stop();
		} catch (err) {
			logger.warn("Failed to stop embedded-postgres cleanly", err);
		}
		supervisorState.pgInstance = null;
	}
	supervisorState.embeddedStatus = null;
}

async function getLocalServerStatus(options = {}) {
	const pgHost = options.pgHost || process.env.DENTE_PG_HOST || "127.0.0.1";
	const pgPort = Number.parseInt(String(options.pgPort || process.env.DENTE_PG_PORT || "5432"), 10) || 5432;
	const apiBaseUrl = options.apiBaseUrl || supervisorState.apiBaseUrl || resolveApiBaseUrl(options);

	const [pgProbe, apiProbe, pgDirInfo] = await Promise.all([
		probePostgresTcpSocket(pgHost, pgPort, 250),
		probeApiHealth(apiBaseUrl, 400),
		inspectPgDataDirectory(options.pgDataDir || supervisorState.pgDataDir),
	]);

	const pgReachable = pgProbe.connected;
	const apiReachable = apiProbe.reachable;
	const isOffline = !pgReachable && !apiReachable;
	const pendingMutationsCount = typeof options.pendingMutationsCount === "number" ? options.pendingMutationsCount : 0;

	return {
		isRunning: pgReachable,
		pgReady: pgReachable,
		apiReachable,
		status: pgReachable && apiReachable ? "online" : pgReachable || apiReachable ? "degraded" : "unreachable",
		engine: activeLocalDbMode === "lan_client" ? "postgres_native" : activeLocalDbMode,
		host: pgHost,
		port: pgPort,
		databaseName: process.env.DENTE_PG_DATABASE || "dental_crm",
		latencyMs: pgProbe.connected ? pgProbe.latencyMs : null,
		canAcceptWrites: pgReachable,
		isOfflineCapable: true,
		pendingMutationsCount,
		pendingMutationsVerified: apiReachable,
		syncMode: isOffline ? "offline_buffer" : activeLocalDbMode === "lan_client" ? "lan_client_sync" : "lan_primary_sync",
		tcpSocketReachable: pgReachable,
		loopbackUrl: supervisorState.loopbackUrl,
		loopbackPort: supervisorState.loopbackPort,
		apiBaseUrl,
		pgDataDir: options.pgDataDir || supervisorState.pgDataDir,
		pgVersion: pgDirInfo.pgVersion,
		managedPgRunning: Boolean(supervisorState.pgInstance),
		managedApiPid: supervisorState.apiChildProcess?.pid ?? null,
		embeddedBackend: supervisorState.embeddedStatus,
	};
}

async function switchLocalDatabaseMode(mode, options = {}) {
	const normalized = typeof mode === "string" ? mode.trim() : "";
	if (normalized && !VALID_LOCAL_DB_MODES.has(normalized)) {
		return {
			success: false,
			activeMode: activeLocalDbMode,
			message: `Неподдерживаемый режим БД '${normalized}'. DENTE работает строго на PostgreSQL 18 (embedded-postgres / postgres_native / lan_client).`,
		};
	}

	activeLocalDbMode = normalized || "embedded-postgres";
	const configFile = options.configFilePath || supervisorState.runtimeConfigPath;
	if (configFile) writeRuntimeConfig(configFile, { engine: activeLocalDbMode });
	return {
		success: true,
		activeMode: activeLocalDbMode,
		message: `Режим локальной базы данных переключен на ${activeLocalDbMode}`,
	};
}

module.exports = {
	VALID_LOCAL_DB_MODES,
	readRuntimeConfig,
	writeRuntimeConfig,
	resolveDefaultWebDistDir,
	resolveDefaultApiEntryPath,
	shouldRunEmbeddedBackend,
	startLoopbackHttpServer,
	stopLoopbackHttpServer,
	getLoopbackBaseUrl,
	probePostgresTcpSocket,
	probeApiHealth,
	ensureManagedPostgresStarted,
	ensureManagedApiStarted,
	ensureEmbeddedBackendStarted,
	stopManagedServices,
	getLocalServerStatus,
	switchLocalDatabaseMode,
	spawnApiServerProcess: spawn,
};
