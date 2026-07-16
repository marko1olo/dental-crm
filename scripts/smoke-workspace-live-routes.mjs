import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { findFreePort } from "./lib/findFreePort.mjs";
import {
	processExitFailure,
	spawnTracked,
	stopTracked,
} from "./lib/processTracking.mjs";
import { sleep } from "./lib/sleep.mjs";

const watchdog = setTimeout(() => {
	console.error("SMOKE TEST TIMEOUT: Process terminated by watchdog");
	process.exit(1);
}, 90000);
watchdog.unref();

const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const configuredPort = process.env.SMOKE_CDP_PORT
	? Number(process.env.SMOKE_CDP_PORT)
	: null;
const port = configuredPort ?? (await findFreePort());
const profileDir = path.join(
	os.tmpdir(),
	`dental-crm-workspace-live-routes-${process.pid}`,
);
const screenshotDir =
	process.env.SMOKE_SCREENSHOT_DIR ?? "test-results/workspace-live-routes";

const apiServerPath = path.resolve("apps/api/dist/server.js");
const vitePath = path.resolve("apps/web/node_modules/vite/bin/vite.js");
const tempRoot = path.join(
	os.tmpdir(),
	`dental-crm-live-routes-${process.pid}`,
);
const stateFilePath = path.join(tempRoot, "state", "dental-crm-state.json");
const backupDir = path.join(tempRoot, "backups");
const snapshotDir = path.join(tempRoot, "document-snapshots");

async function waitForHttp(url, label, attempts = 120) {
	let lastError;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const response = await fetch(url, { cache: "no-store" });
			if (response.ok) {
				return response;
			}
			lastError = new Error(`${label} HTTP ${response.status}`);
		} catch (error) {
			lastError = error;
		}
		await sleep(250);
	}
	throw lastError ?? new Error(`${label} was not reachable`);
}

let baseTargetUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? null;
let isIsolated = false;
let apiProcess = null;
let webProcess = null;

if (!baseTargetUrl) {
	isIsolated = true;
	if (!existsSync(apiServerPath)) {
		throw new Error("Build API first: apps/api/dist/server.js is missing.");
	}
	if (!existsSync(vitePath)) {
		throw new Error(
			"Vite binary is missing. Run dependency install before this smoke test.",
		);
	}
	const apiPort = await findFreePort();
	const webPort = await findFreePort();
	const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
	baseTargetUrl = `http://127.0.0.1:${webPort}`;

	await mkdir(tempRoot, { recursive: true });

	const apiBootstrap = `
  import { pathToFileURL } from "node:url";
  const { createDenteApiApp } = await import(pathToFileURL(process.env.DENTAL_API_SERVER_PATH).href);
  const app = await createDenteApiApp({ startTelegramWorker: false });
  await app.listen({ host: process.env.API_HOST, port: Number(process.env.API_PORT) });
  `;

	apiProcess = spawnTracked(
		"api",
		process.execPath,
		["--input-type=module", "-e", apiBootstrap],
		{
			cwd: process.cwd(),
			env: {
				...process.env,
				API_HOST: "127.0.0.1",
				API_PORT: String(apiPort),
				WEB_ORIGIN: baseTargetUrl,
				NODE_ENV: "development",
				DENTE_CLINICAL_ADMIN_SECRET: "",
				DENTE_SETTINGS_ADMIN_SECRET: "",
				DENTE_SCHEDULE_ADMIN_SECRET: "",
				DENTE_TELEGRAM_ADMIN_SECRET: "",
				DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS: "1",
				DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS: "1",
				DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS: "1",
				DENTE_CLINICAL_ALLOW_UNGUARDED_READS: "1",
				DENTAL_API_SERVER_PATH: apiServerPath,
				DENTAL_STATE_FILE: stateFilePath,
				DENTAL_STATE_BACKUP_DIR: backupDir,
				DENTAL_STATE_BACKUPS: "2",
				DENTAL_DOCUMENT_SNAPSHOT_DIR: snapshotDir,
				DENTAL_SPEECH_PROVIDER: "demo",
				DENTAL_SPEECH_POLISH_PROVIDER: "demo",
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	webProcess = spawnTracked(
		"web",
		process.execPath,
		[
			vitePath,
			"--host",
			"127.0.0.1",
			"--port",
			String(webPort),
			"--strictPort",
		],
		{
			cwd: path.resolve("apps/web"),
			env: {
				...process.env,
				DENTAL_API_PROXY_TARGET: apiBaseUrl,
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	await Promise.race([
		waitForHttp(`${apiBaseUrl}/api/health`, "isolated API"),
		processExitFailure(apiProcess, "isolated API"),
	]);
	await Promise.race([
		waitForHttp(baseTargetUrl, "isolated web"),
		processExitFailure(webProcess, "isolated web"),
	]);
}

const routes = [
	{
		hash: "shift",
		rootSelector: "#shift.shift-hero",
		readySelectors: [".patient-cockpit"],
	},
	{
		hash: "schedule",
		rootSelector: "#schedule.schedule-panel",
		readySelectors: ['[data-testid="schedule-shift-summary"]'],
	},
	{
		hash: "patients",
		rootSelector: "#patients.patients-panel",
		readySelectors: [".quick-create input", ".patient-list"],
	},
	{
		hash: "imaging",
		rootSelector: "#imaging.imaging-panel",
		readySelectors: [
			'[data-testid="imaging-pick-dicom-folder"]',
			'[data-testid="imaging-pick-dicom-files"]',
		],
	},
	{
		hash: "visit",
		rootSelector: "#visit.visit-panel",
		readySelectors: [".tooth-map", ".dictation-actions button"],
	},
	{
		hash: "documents",
		rootSelector: "#documents.documents-panel",
		readySelectors: [".document-factory"],
	},
	{
		hash: "finance",
		rootSelector: "#finance.finance-panel",
		readySelectors: ["#payment-capture", ".finance-scope-label"],
	},
	{
		hash: "communications",
		rootSelector: "#communications.communications-panel",
		readySelectors: [".communication-layout"],
	},
	{
		hash: "settings",
		rootSelector: "#settings.settings-zone",
		readySelectors: [".settings-tabs button", ".settings-tab-panel"],
	},
];

const browserCandidates = [
	process.env.BROWSER_BIN,
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/usr/bin/microsoft-edge",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
].filter(Boolean);

const browserPath = browserCandidates.find((candidate) =>
	existsSync(candidate),
);
if (!browserPath) {
	throw new Error(
		"No Chromium/Edge browser found. Set BROWSER_BIN to run the workspace live routes smoke test.",
	);
}

function routeUrl(hash) {
	const url = new URL(baseTargetUrl);
	url.hash = hash;
	return url.href;
}

function connectCdp(wsUrl) {
	const socket = new WebSocket(wsUrl);
	let id = 0;
	const pending = new Map();
	const events = [];

	socket.onmessage = (event) => {
		const message = JSON.parse(event.data);
		if (!message.id) {
			events.push(message);
			return;
		}
		const request = pending.get(message.id);
		if (!request) return;
		pending.delete(message.id);
		if (message.error) request.reject(new Error(message.error.message));
		else request.resolve(message.result);
	};

	const opened = new Promise((resolve, reject) => {
		socket.onopen = resolve;
		socket.onerror = () => reject(new Error("CDP websocket failed"));
	});

	return {
		opened,
		events,
		send(method, params = {}) {
			id += 1;
			socket.send(JSON.stringify({ id, method, params }));
			return new Promise((resolve, reject) =>
				pending.set(id, { resolve, reject }),
			);
		},
		close() {
			socket.close();
		},
	};
}

async function cleanup(browser) {
	if (!browser.killed) browser.kill();
	await Promise.race([
		new Promise((resolve) => browser.once("exit", resolve)),
		sleep(2_000),
	]);
	await rm(profileDir, {
		recursive: true,
		force: true,
		maxRetries: 5,
		retryDelay: 250,
	});
	if (isIsolated) {
		await stopTracked(webProcess);
		await stopTracked(apiProcess);
		await rm(tempRoot, {
			recursive: true,
			force: true,
			maxRetries: 5,
			retryDelay: 250,
		});
	}
}

function routeReadyExpression(route) {
	return `(() => {
    const root = document.querySelector(${JSON.stringify(route.rootSelector)});
    const routeError = document.querySelector(".workspace-route-error");
    const activeNav = document.querySelector('.nav-item[aria-current="page"]') || document.querySelector(".nav-item.active");
    const activeHref = activeNav ? activeNav.getAttribute("href") : null;
    const currentHash = window.location.hash.replace(/^#/, "").split("/")[0];
    const readySelectors = ${JSON.stringify(route.readySelectors)};
    const missingReadySelectors = readySelectors.filter((selector) => !document.querySelector(selector));
    if (!root || routeError || root.getAttribute("aria-busy") === "true" || activeHref !== "#${route.hash}" || currentHash !== "${route.hash}" || missingReadySelectors.length) {
      return null;
    }
    const visibleButtons = Array.from(root.querySelectorAll("button, a, input, select, textarea")).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    }).length;
    return {
      hash: "${route.hash}",
      activeHref,
      currentHash,
      rootSelector: ${JSON.stringify(route.rootSelector)},
      rootTextLength: root.innerText.trim().length,
      visibleControls: visibleButtons
    };
  })()`;
}

await mkdir(profileDir, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

let browserStderr = "";
const browser = spawn(
	browserPath,
	[
		"--headless=new",
		"--disable-gpu",
		"--disable-dev-shm-usage",
		"--disable-extensions",
		"--no-first-run",
		"--no-default-browser-check",
		"--remote-allow-origins=*",
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${profileDir}`,
		`--window-size=${width},${height}`,
		routeUrl(routes[0].hash),
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);
browser.stderr?.on("data", (chunk) => {
	browserStderr = `${browserStderr}${chunk.toString("utf8")}`.slice(-4_000);
});

try {
	const browserExitFailure = new Promise((_, reject) => {
		browser.once("exit", (code, signal) => {
			const stderrTail = browserStderr.trim();
			reject(
				new Error(
					`Browser exited before CDP became ready (code=${code ?? "null"}, signal=${signal ?? "null"})${
						stderrTail ? `: ${stderrTail.slice(-1_000)}` : ""
					}`,
				),
			);
		});
	});

	const targets = await Promise.race([
		fetchJson(`http://127.0.0.1:${port}/json/list`),
		browserExitFailure,
	]);
	const pageTarget =
		targets.find((target) => target.type === "page") ?? targets[0];
	if (!pageTarget?.webSocketDebuggerUrl)
		throw new Error("No page CDP target found");

	const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
	await cdp.opened;
	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 1,
		mobile: false,
	});

	const results = [];
	for (const route of routes) {
		await cdp.send("Page.navigate", { url: routeUrl(route.hash) });
		await waitFor(
			cdp,
			`(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
			`${route.hash} app shell`,
		);
		const result = await waitFor(
			cdp,
			routeReadyExpression(route),
			`${route.hash} workspace route`,
		);
		const screenshotPath = path.join(screenshotDir, `${route.hash}.png`);
		const capture = await cdp.send("Page.captureScreenshot", {
			format: "png",
			captureBeyondViewport: true,
		});
		await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
		results.push({ ...result, screenshot: screenshotPath });
	}

	cdp.close();
	console.log(
		JSON.stringify({
			ok: true,
			guard: "workspace-live-routes",
			checkedRoutes: results.length,
			routes: results,
		}),
	);
} finally {
	await cleanup(browser);
}
