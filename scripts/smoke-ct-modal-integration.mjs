import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { evaluate, waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { findFreePort } from "./lib/findFreePort.mjs";
import {
	processExitFailure,
	spawnTracked,
	stopTracked,
} from "./lib/processTracking.mjs";
import { resolveViteBin } from "./lib/resolveViteBin.mjs";
import { sleep } from "./lib/sleep.mjs";

const watchdog = setTimeout(() => {
	console.error("SMOKE TEST TIMEOUT: Process terminated by watchdog");
	process.exit(1);
}, 90000);
watchdog.unref();

const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const apiPort = Number(process.env.SMOKE_API_PORT ?? (await findFreePort()));
const webPort = Number(process.env.SMOKE_WEB_PORT ?? (await findFreePort()));
const cdpPort = Number(process.env.SMOKE_CDP_PORT ?? (await findFreePort()));
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const tempRoot = path.join(
	os.tmpdir(),
	`dental-crm-smoke-ct-modal-${process.pid}`,
);
const stateFilePath = path.join(tempRoot, "state", "dental-crm-state.json");
const backupDir = path.join(tempRoot, "backups");
const snapshotDir = path.join(tempRoot, "document-snapshots");
const browserProfileDir = path.join(tempRoot, "browser-profile");
const apiServerPath = path.resolve("apps/api/dist/server.js");

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
		"No Chromium/Edge browser found. Set BROWSER_BIN to run the CT modal smoke test.",
	);
}
if (!existsSync(apiServerPath)) {
	throw new Error("Build API first: apps/api/dist/server.js is missing.");
}
const cryptoHelperPath = path.resolve("apps/api/dist/utils/cryptoHelper.js");
const { signToken } = await import(pathToFileURL(cryptoHelperPath).href);

const smokeAuthTokenSecret = "dente-smoke-test-secret-32-chars-long-min!!";
const defaultOrgId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const clinicToken = signToken(
	{ organizationId: defaultOrgId, clinicName: "Стоматология" },
	smokeAuthTokenSecret,
	86400,
);
const staffToken = signToken(
	{
		userId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		fullName: "Главный Врач",
		role: "doctor",
		organizationId: defaultOrgId,
	},
	smokeAuthTokenSecret,
	86400,
);
const vitePath = resolveViteBin();

async function waitForHttp(url, label, attempts = 80) {
	let lastError = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const res = await fetch(url);
			if (res.ok || res.status === 404 || res.status === 200) return;
			lastError = new Error(`HTTP ${res.status}`);
		} catch (error) {
			lastError = error;
		}
		await sleep(250);
	}
	throw new Error(
		`Timed out waiting for ${label} at ${url}: ${lastError?.message ?? "unknown error"}`,
	);
}

function connectCdp(webSocketDebuggerUrl) {
	const socket = new WebSocket(webSocketDebuggerUrl);
	let id = 0;
	const pending = new Map();

	socket.onmessage = (event) => {
		const message = JSON.parse(event.data);
		if (!message.id) {
			if (message.method === "Runtime.consoleAPICalled") {
				const args = message.params?.args?.map((a) => a.value ?? a.description ?? a) ?? [];
				console.log("[Browser Console]", message.params?.type, ...args);
			}
			if (message.method === "Runtime.exceptionThrown") {
				console.error("[Browser Exception]", message.params?.exceptionDetails?.text, message.params?.exceptionDetails?.exception?.description);
			}
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

function childExitFailure(child, label) {
	return new Promise((_, reject) => {
		child.once("exit", (code, signal) => {
			reject(
				new Error(
					`${label} exited early (code=${code ?? "null"}, signal=${signal ?? "null"})`,
				),
			);
		});
	});
}

async function navigateTo(cdp, hash, selector) {
	await cdp.send("Page.navigate", { url: `${webBaseUrl}/#${hash}` });
	for (let i = 0; i < 50; i++) {
		const evalRes = await cdp.send("Runtime.evaluate", {
			expression: `({
				readyState: document.readyState,
				url: window.location.href,
				hasAppShell: Boolean(document.querySelector(".app-shell")),
				bodyText: document.body?.innerText?.slice(0, 300) ?? "",
				firstElement: document.body?.firstElementChild?.className ?? ""
			})`,
			returnByValue: true,
		});
		if (evalRes.result?.value?.hasAppShell) break;
		if (i % 5 === 0) {
			console.log(`[Diagnostic] Waiting for ${hash} app shell (attempt ${i}):`, evalRes.result?.value);
			if (typeof webProcess !== "undefined") {
				console.log(`[Diagnostic Web stderr]:`, webProcess.stderr()?.slice(-400) || "<empty>");
			}
		}
		await sleep(250);
	}
	await waitFor(
		cdp,
		`(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
		`${hash} app shell`,
	);
	await waitFor(
		cdp,
		`(() => {
			const el = document.querySelector(${JSON.stringify(selector)});
			return el && el.getAttribute("aria-busy") !== "true";
		})()`,
		`${hash} selector ${selector} not busy`,
	);
}

await rm(tempRoot, { recursive: true, force: true });
await mkdir(path.dirname(stateFilePath), { recursive: true });
await mkdir(backupDir, { recursive: true });
await mkdir(snapshotDir, { recursive: true });
await mkdir(browserProfileDir, { recursive: true });

const seedStatePath = path.resolve("apps/api/.data/dental-crm-state.json");
if (existsSync(seedStatePath)) {
	await copyFile(seedStatePath, stateFilePath);
}

const apiBootstrap = `
import { pathToFileURL } from "node:url";
const { createDenteApiApp } = await import(pathToFileURL(process.env.DENTAL_API_SERVER_PATH).href);
const app = await createDenteApiApp({ startTelegramWorker: false });
await app.listen({ host: process.env.API_HOST, port: Number(process.env.API_PORT) });
`;

const apiProcess = spawnTracked(
	"api",
	process.execPath,
	["--input-type=module", "-e", apiBootstrap],
	{
		cwd: process.cwd(),
		env: {
			...process.env,
			API_HOST: "127.0.0.1",
			API_PORT: String(apiPort),
			WEB_ORIGIN: webBaseUrl,
			NODE_ENV: "development",
			DENTE_DEV_ALLOW_HEADER_ORG: "1",
			AUTH_TOKEN_SECRET: smokeAuthTokenSecret,
			DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS: "1",
			DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS: "1",
			DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS: "1",
			DENTE_CLINICAL_ALLOW_UNGUARDED_READS: "1",
			DENTE_CLINICAL_ADMIN_SECRET: "",
			DENTE_SETTINGS_ADMIN_SECRET: "",
			DENTE_SCHEDULE_ADMIN_SECRET: "",
			DENTE_TELEGRAM_ADMIN_SECRET: "",
			DENTAL_API_SERVER_PATH: apiServerPath,
			DENTAL_STATE_FILE: stateFilePath,
			DENTAL_STATE_BACKUP_DIR: backupDir,
			DENTAL_DOCUMENT_SNAPSHOT_DIR: snapshotDir,
			DENTAL_SPEECH_PROVIDER: "demo",
			DENTAL_SPEECH_POLISH_PROVIDER: "demo",
		},
		stdio: ["ignore", "pipe", "pipe"],
	},
);

const webProcess = spawnTracked(
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
			VITE_API_URL: apiBaseUrl,
			VITE_DEV_PROXY_TARGET: apiBaseUrl,
		},
		stdio: ["ignore", "pipe", "pipe"],
	},
);

let browserProcess = null;
let cdp = null;

try {
	await Promise.race([
		waitForHttp(`${apiBaseUrl}/api/health`, "isolated api"),
		processExitFailure(apiProcess, "isolated api"),
	]);
	await Promise.race([
		waitForHttp(webBaseUrl, "isolated web"),
		processExitFailure(webProcess, "isolated web"),
	]);

	try {
		const res = await fetch(`${apiBaseUrl}/api/dashboard`, {
			headers: {
				"x-organization-id": defaultOrgId,
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
		});
		const resText = await res.text();
		if (!res.ok) {
			console.error(`[Diagnostic API dashboard HTTP ${res.status}]:`, resText);
			console.error("[Diagnostic API stdout]:", apiProcess.stdout());
			console.error("[Diagnostic API stderr]:", apiProcess.stderr());
		} else {
			const initialDashboard = JSON.parse(resText);
			console.log("[Diagnostic API dashboard]", {
				clinicName: initialDashboard?.clinicSettings?.profile?.brandName,
				activeVisit: initialDashboard?.activeVisit?.id,
				patientsCount: initialDashboard?.patients?.length,
			});
		}
	} catch (err) {
		console.error("[Diagnostic API dashboard FAILED]:", err);
		console.error("[Diagnostic API stdout]:", apiProcess.stdout());
		console.error("[Diagnostic API stderr]:", apiProcess.stderr());
	}

	browserProcess = spawn(
		browserPath,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-first-run",
			"--no-default-browser-check",
			`--user-data-dir=${browserProfileDir}`,
			`--remote-debugging-port=${cdpPort}`,
			`--window-size=${width},${height}`,
			"about:blank",
		],
		{ stdio: ["ignore", "ignore", "pipe"] },
	);

	const targets = await Promise.race([
		fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 120),
		childExitFailure(browserProcess, "browser"),
	]);
	const pageTarget =
		targets.find((target) => target.type === "page") ?? targets[0];
	if (!pageTarget?.webSocketDebuggerUrl) {
		throw new Error("No page CDP target found");
	}

	cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
	await cdp.opened;
	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");
	await cdp.send("DOM.enable");
	await cdp.send("Log.enable");

	// Forward browser console logs and errors to node console for instant visibility
	const origOnMessage = cdp.socket?.onmessage;
	// Capture console and exception events via CDP messages
	await cdp.send("Runtime.addBinding", { name: "denteCdpLogger" }).catch(() => {});

	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 1,
		mobile: false,
	});

	await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
		source: `
			window.addEventListener("error", (e) => {
				console.error("[Browser Error]", e.message, e.filename, e.lineno, e.error?.stack);
			});
			window.addEventListener("unhandledrejection", (e) => {
				console.error("[Unhandled Rejection]", e.reason);
			});
			window.localStorage.setItem("dente_organization_id", ${JSON.stringify(defaultOrgId)});
			window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
			window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
			window.localStorage.setItem("dente_user_role", "doctor");
		`,
	});

	// ==========================================
	// STEP 1: VISIT -> CT MODAL OPEN & VERIFY
	// ==========================================
	await navigateTo(cdp, "visit", "#visit.visit-panel");

	// Switch to Diagnostics subtab
	const switchSubtabResult = await evaluate(
		cdp,
		`(() => {
			const tabBtn = document.querySelector('[data-testid="visit-subtab-diagnostics"]');
			if (!tabBtn) return { ok: false, reason: "missing_diagnostics_tab" };
			tabBtn.click();
			return { ok: true };
		})()`,
		"switch to visit diagnostics subtab",
	);
	if (!switchSubtabResult.ok) {
		throw new Error(`Failed to switch to diagnostics subtab: ${JSON.stringify(switchSubtabResult)}`);
	}

	// Wait for open CBCT studio button
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector('[data-testid="btn-open-cbct-studio-modal"]')))()`,
		"btn-open-cbct-studio-modal in visit",
	);

	// Click to open CBCT studio modal
	await evaluate(
		cdp,
		`(() => {
			const btn = document.querySelector('[data-testid="btn-open-cbct-studio-modal"]');
			if (!btn) return { ok: false, reason: "missing_cbct_btn" };
			btn.click();
			return { ok: true };
		})()`,
		"click open cbct studio modal from visit",
	);

	// Wait for modal to render in DOM
	const visitModalRendered = await waitFor(
		cdp,
		`(() => {
			const modal = document.querySelector('[data-testid="cbct-studio-modal"]');
			const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]');
			const dropzone = document.querySelector('[data-testid="cbct-empty-volume-dropzone"]');
			const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
			if (modal && badge && dropzone && closeBtn) {
				return {
					modalExists: true,
					badgeText: badge.textContent?.trim() || "",
					hasDropzone: true,
				};
			}
			return null;
		})()`,
		"cbct-studio-modal opened from visit",
	);

	// Close the CBCT studio modal
	await evaluate(
		cdp,
		`(() => {
			const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
			if (closeBtn) closeBtn.click();
		})()`,
		"close cbct studio modal",
	);

	// Verify modal is closed
	await waitFor(
		cdp,
		`(() => !document.querySelector('[data-testid="cbct-studio-modal"]'))()`,
		"cbct-studio-modal closed from visit",
	);

	// ==========================================
	// STEP 2: PATIENT CARD -> CT MODAL OPEN & VERIFY
	// ==========================================
	await navigateTo(cdp, "patients", "#patients.patients-panel");

	// Select first patient if not already open
	await evaluate(
		cdp,
		`(() => {
			const firstPatient = document.querySelector(".patient-list-item, [data-testid^='patient-item-']");
			if (firstPatient) firstPatient.click();
		})()`,
		"select patient in list",
	);

	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector('[data-testid="patient-workspace-view"]')))()`,
		"patient-workspace-view visible",
	);

	// Open docs/secondary menu
	await evaluate(
		cdp,
		`(() => {
			const menuTrigger = document.querySelector('[data-testid="patient-workspace-view"] button[aria-expanded]');
			if (menuTrigger && menuTrigger.getAttribute("aria-expanded") !== "true") {
				menuTrigger.click();
			}
		})()`,
		"open patient workspace docs menu",
	);

	// Wait for open CBCT button in patient card
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector('[data-testid="patient-workspace-open-cbct-modal-btn"]')))()`,
		"patient-workspace-open-cbct-modal-btn ready",
	);

	// Click to open CBCT studio modal from patient card
	await evaluate(
		cdp,
		`(() => {
			const btn = document.querySelector('[data-testid="patient-workspace-open-cbct-modal-btn"]');
			if (btn) btn.click();
		})()`,
		"click patient-workspace-open-cbct-modal-btn",
	);

	// Wait for modal and verify patient name prop is displayed
	const patientModalRendered = await waitFor(
		cdp,
		`(() => {
			const modal = document.querySelector('[data-testid="cbct-studio-modal"]');
			const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]');
			const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
			if (modal && badge && closeBtn) {
				return {
					modalExists: true,
					badgeText: badge.textContent?.trim() || "",
				};
			}
			return null;
		})()`,
		"cbct-studio-modal opened from patient workspace",
	);

	// Close modal
	await evaluate(
		cdp,
		`(() => {
			const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
			if (closeBtn) closeBtn.click();
		})()`,
		"close cbct modal from patient workspace",
	);

	await waitFor(
		cdp,
		`(() => !document.querySelector('[data-testid="cbct-studio-modal"]'))()`,
		"cbct-studio-modal closed from patient workspace",
	);

	// ==========================================
	// STEP 3: SCHEDULE -> RADIOLOGY / CT VIEW INTEGRATION
	// ==========================================
	await navigateTo(cdp, "schedule", "#schedule.schedule-panel");

	// Test navigating to #radiology / #imaging alias
	await cdp.send("Page.navigate", { url: `${webBaseUrl}/#radiology` });
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector('[data-testid="imaging-open-cbct-studio"]')))()`,
		"imaging-open-cbct-studio rendered from #radiology hash alias",
	);

	// Open CBCT studio from Imaging View
	const imagingClickRes = await evaluate(
		cdp,
		`(() => {
			const btn = document.querySelector('[data-testid="imaging-open-cbct-studio"]');
			if (!btn) return { ok: false, reason: "missing_imaging_cbct_btn" };
			btn.click();
			return { ok: true };
		})()`,
		"open cbct studio from imaging view",
	);
	if (!imagingClickRes.ok) {
		throw new Error(`Failed to click imaging-open-cbct-studio: ${JSON.stringify(imagingClickRes)}`);
	}

	const imagingModalRendered = await waitFor(
		cdp,
		`(() => Boolean(document.querySelector('[data-testid="cbct-studio-modal"]')))()`,
		"cbct-studio-modal opened from imaging view",
	);

	// Close modal
	await evaluate(
		cdp,
		`(() => {
			const closeBtn = document.querySelector('[data-testid="close-cbct-mpr-3d-studio-btn"]');
			if (closeBtn) closeBtn.click();
		})()`,
		"close cbct studio modal from imaging view",
	);

	await waitFor(
		cdp,
		`(() => !document.querySelector('[data-testid="cbct-studio-modal"]'))()`,
		"cbct-studio-modal closed from imaging view",
	);

	console.log(
		JSON.stringify(
			{
				ok: true,
				guard: "smoke-ct-modal-integration",
				visitCtModal: Boolean(visitModalRendered),
				visitBadgeText: visitModalRendered?.badgeText || "",
				patientWorkspaceCtModal: Boolean(patientModalRendered),
				patientBadgeText: patientModalRendered?.badgeText || "",
				scheduleCtIntegration: Boolean(imagingModalRendered),
			},
			null,
			2,
		),
	);
} finally {
	cdp?.close();
	if (browserProcess) {
		browserProcess.kill("SIGKILL");
	}
	await stopTracked(webProcess);
	await stopTracked(apiProcess);
	await rm(tempRoot, { recursive: true, force: true });
}
