/**
 * DENTE Dental CRM — Embedded Loopback HTTP Server, PG18 Supervisor & Runtime Config
 */

const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
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
};

function resolveDefaultWebDistDir() {
	const packagedDist = process.resourcesPath ? path.join(process.resourcesPath, "web", "dist") : null;
	if (packagedDist && fs.existsSync(path.join(packagedDist, "index.html"))) {
		return packagedDist;
	}
	return path.resolve(__dirname, "../../apps/web/dist");
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

async function stopManagedServices() {
	await stopLoopbackHttpServer();
	if (supervisorState.apiChildProcess) {
		try {
			supervisorState.apiChildProcess.kill("SIGTERM");
		} catch (err) {
			logger.warn("Failed to terminate managed API child process", err);
		}
		supervisorState.apiChildProcess = null;
	}
	if (supervisorState.pgInstance) {
		try {
			await supervisorState.pgInstance.stop();
		} catch (err) {
			logger.warn("Failed to stop embedded-postgres cleanly", err);
		}
		supervisorState.pgInstance = null;
	}
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
	startLoopbackHttpServer,
	stopLoopbackHttpServer,
	getLoopbackBaseUrl,
	probePostgresTcpSocket,
	probeApiHealth,
	ensureManagedPostgresStarted,
	stopManagedServices,
	getLocalServerStatus,
	switchLocalDatabaseMode,
	spawnApiServerProcess: spawn,
};
