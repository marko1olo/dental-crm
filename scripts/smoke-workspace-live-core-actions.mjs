import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { evaluate, setFileInputFiles, waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { findFreePort } from "./lib/findFreePort.mjs";
import { inputHelpersExpression } from "./lib/inputHelpersExpression.mjs";
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
	`dental-crm-live-core-actions-${process.pid}`,
);
const stateFilePath = path.join(tempRoot, "state", "dental-crm-state.json");
const backupDir = path.join(tempRoot, "backups");
const snapshotDir = path.join(tempRoot, "document-snapshots");
const browserProfileDir = path.join(tempRoot, "browser-profile");
const fixtureDir = path.join(tempRoot, "dicom-fixtures");
const screenshotDir =
	process.env.SMOKE_SCREENSHOT_DIR ??
	"test-results/workspace-live-core-actions";
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
		"No Chromium/Edge browser found. Set BROWSER_BIN to run the workspace live core actions smoke test.",
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

function pad2(value) {
	return String(value).padStart(2, "0");
}

function toDateTimeLocalInputValue(date) {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function nextBusinessMorningWindow(scheduleDefaults = {}, existingAppointments = []) {
	const workingDays =
		Array.isArray(scheduleDefaults.workingDays) &&
		scheduleDefaults.workingDays.length
			? new Set(scheduleDefaults.workingDays)
			: new Set([1, 2, 3, 4, 5]);
	const [defaultHour, defaultMinute] = String(
		scheduleDefaults.workdayStart ?? "09:00",
	)
		.split(":")
		.map((part) => Number.parseInt(part, 10));
	const hour =
		Number.isInteger(defaultHour) && defaultHour >= 0 && defaultHour <= 23
			? defaultHour
			: 9;
	const minute =
		Number.isInteger(defaultMinute) && defaultMinute >= 0 && defaultMinute <= 59
			? defaultMinute
			: 0;
	const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
	for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
		start.setTime(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
		if (workingDays.has(start.getDay())) break;
	}
	start.setHours(hour, minute, 0, 0);

	const isOverlapping = (candidateStart, candidateEnd) => {
		return existingAppointments.some((app) => {
			if (!app?.startsAt || !app?.endsAt) return false;
			const appStart = new Date(app.startsAt).getTime();
			const appEnd = new Date(app.endsAt).getTime();
			return candidateStart < appEnd && candidateEnd > appStart;
		});
	};

	let candidateStart = start.getTime();
	let candidateEnd = candidateStart + 30 * 60 * 1000;
	while (isOverlapping(candidateStart, candidateEnd)) {
		candidateStart += 30 * 60 * 1000;
		candidateEnd = candidateStart + 30 * 60 * 1000;
	}
	const finalStart = new Date(candidateStart);
	const finalEnd = new Date(candidateEnd);

	return {
		startsAtLocal: toDateTimeLocalInputValue(finalStart),
		endsAtLocal: toDateTimeLocalInputValue(finalEnd),
	};
}

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

function connectCdp(wsUrl) {
	const socket = new WebSocket(wsUrl);
	let id = 0;
	const pending = new Map();

	socket.onmessage = (event) => {
		const message = JSON.parse(event.data);
		if (message.method === "Runtime.consoleAPICalled") {
			const args = message.params.args
				.map((a) => {
					if (a.value !== undefined) return JSON.stringify(a.value);
					if (a.preview) {
						const props = (a.preview.properties || [])
							.map((p) => `${p.name}: ${p.value ?? p.description}`)
							.join(", ");
						return `${a.description || a.type} {${props}}`;
					}
					return a.description || JSON.stringify(a);
				})
				.join(" ");
			console.log(`[BROWSER CONSOLE]:`, args);
		}
		if (message.method === "Runtime.exceptionThrown") {
			const details = message.params.exceptionDetails;
			console.log(
				`[BROWSER EXCEPTION]:`,
				details.text,
				details.exception?.description || details.exception?.value || JSON.stringify(details),
			);
		}
		if (!message.id) return;
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

async function navigateTo(cdp, hash, selector) {
	await cdp.send("Page.navigate", { url: `${webBaseUrl}/#${hash}` });
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

async function saveScreenshot(cdp, name) {
	const capture = await cdp.send("Page.captureScreenshot", {
		format: "png",
		captureBeyondViewport: true,
	});
	const screenshotPath = path.join(screenshotDir, `${name}.png`);
	await mkdir(path.dirname(screenshotPath), { recursive: true });
	await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
	return screenshotPath;
}

async function dashboard() {
	return fetchJson(`${apiBaseUrl}/api/dashboard`, 40, {
		headers: {
			"x-organization-id": defaultOrgId,
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
		},
	});
}

async function waitForDashboard(predicate, label, attempts = 80) {
	let current = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		current = await dashboard();
		const result = predicate(current);
		if (result) {
			return { dashboard: current, result };
		}
		if (attempt === 0 || attempt % 20 === 0 || attempt === attempts - 1) {
			console.log(`[waitForDashboard ${label} attempt ${attempt}]:`, {
				eventsCount: current.communicationEvents?.length,
				tasks: current.communicationTasks?.map((t) => ({ id: t.id, status: t.status })),
			});
		}
		await sleep(250);
	}
	throw new Error(`${label} did not appear in dashboard`);
}

async function createFixtureFiles() {
	await mkdir(fixtureDir, { recursive: true });
	const dicomBytes = Buffer.alloc(180, 0);
	dicomBytes.write("DICM", 128, "ascii");
	const fixtures = [
		["smoke-case-001.dcm", dicomBytes],
		["smoke-panorama.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
		["smoke-export.zip", Buffer.from("PK\x03\x04synthetic", "binary")],
	];
	const files = [];
	for (const [name, content] of fixtures) {
		const filePath = path.join(fixtureDir, name);
		await writeFile(filePath, content);
		files.push(filePath);
	}
	return files;
}

await mkdir(tempRoot, { recursive: true });
await mkdir(path.dirname(stateFilePath), { recursive: true });
const seedStatePath = path.resolve("apps/api/.data/dental-crm-state.json");
if (existsSync(seedStatePath)) {
	await copyFile(seedStatePath, stateFilePath);
}
await mkdir(screenshotDir, { recursive: true });

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
			DENTE_CLINICAL_ADMIN_SECRET: "",
			DENTE_SETTINGS_ADMIN_SECRET: "",
			DENTE_SCHEDULE_ADMIN_SECRET: "",
			DENTE_TELEGRAM_ADMIN_SECRET: "",
			DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS: "1",
			DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS: "1",
			DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS: "1",
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

const webProcess = spawnTracked(
	"web",
	process.execPath,
	[vitePath, "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
	{
		cwd: path.resolve("apps/web"),
		env: {
			...process.env,
			DENTAL_API_PROXY_TARGET: apiBaseUrl,
			VITE_DISABLE_HMR: "true",
			VITE_DISABLE_WATCH: "true",
		},
		stdio: ["ignore", "pipe", "pipe"],
	},
);

let browserProcess = null;

try {
	await Promise.race([
		waitForHttp(`${apiBaseUrl}/api/health`, "isolated API"),
		processExitFailure(apiProcess, "isolated API"),
	]);
	await Promise.race([
		waitForHttp(webBaseUrl, "isolated web"),
		processExitFailure(webProcess, "isolated web"),
	]);

	const fixtureFiles = await createFixtureFiles();
	let initialDashboard = await dashboard();
	if (!initialDashboard.clinicSettings?.chairs?.some((c) => c.active)) {
		await fetch(`${apiBaseUrl}/api/settings/chairs`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-organization-id": defaultOrgId,
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			body: JSON.stringify({ name: "Основное кресло" }),
		});
		initialDashboard = await dashboard();
	}
	if (
		initialDashboard.clinicSettings.profile.mode !== "solo_doctor" &&
		!initialDashboard.clinicSettings?.staff?.some(
			(m) => m.active && m.role === "assistant",
		)
	) {
		await fetch(`${apiBaseUrl}/api/settings/staff`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-organization-id": defaultOrgId,
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			body: JSON.stringify({
				fullName: "Ассистент Клиники",
				role: "assistant",
				specialties: ["universal"],
			}),
		});
		initialDashboard = await dashboard();
	}
	const initialPaymentCount = initialDashboard.payments.length;
	const initialDocumentCount = initialDashboard.documents.length;
	const initialAppointmentCount = initialDashboard.appointments.length;
	const initialCommunicationEventCount =
		initialDashboard.communicationEvents.length;
	const openCommunicationTask = initialDashboard.communicationTasks.find(
		(task) => task.status !== "completed",
	);
	const activePatientName = initialDashboard.patients.find(
		(patient) => patient.id === initialDashboard.activeVisit.patientId,
	)?.fullName;
	if (!activePatientName) {
		throw new Error("Active patient was not found in isolated dashboard");
	}

	await mkdir(browserProfileDir, { recursive: true });
	browserProcess = spawnTracked(
		"browser",
		browserPath,
		[
			"--headless=new",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--disable-extensions",
			"--no-first-run",
			"--no-default-browser-check",
			"--remote-allow-origins=*",
			`--remote-debugging-port=${cdpPort}`,
			`--user-data-dir=${browserProfileDir}`,
			`--window-size=${width},${height}`,
			`${webBaseUrl}/#finance`,
		],
		{ stdio: ["ignore", "ignore", "pipe"] },
	);

	const targets = await Promise.race([
		fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 120),
		processExitFailure(browserProcess, "browser"),
	]);
	const pageTarget =
		targets.find((target) => target.type === "page") ?? targets[0];
	if (!pageTarget?.webSocketDebuggerUrl) {
		throw new Error("No page CDP target found");
	}

	const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
	await cdp.opened;
	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");
	await cdp.send("DOM.enable");
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 1,
		mobile: false,
	});

	await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
		source: `
			window.localStorage.setItem("dente_organization_id", ${JSON.stringify(defaultOrgId)});
			window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
			window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
			window.localStorage.setItem("dente_user_role", "doctor");
		`,
	});

	await navigateTo(cdp, "finance", "#finance.finance-panel");
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector("#payment-capture #payment-amount-input")))()`,
		"payment capture form",
	);
	const paymentInputResult = await evaluate(
		cdp,
		inputHelpersExpression(`
      const amount = document.querySelector("#payment-amount-input");
      if (!amount) {
        return { ok: false, reason: "missing_amount_input" };
      }
      setFieldValue(amount, "1200");
      return { ok: true, amount: amount.value };
    `),
		"fill payment amount",
	);
	if (!paymentInputResult.ok) {
		throw new Error(
			`Payment form was not filled: ${JSON.stringify(paymentInputResult)}`,
		);
	}
	await waitFor(
		cdp,
		`(() => {
      const button = document.querySelector("#payment-capture button.primary-button");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
		"payment submit button",
	);
	await evaluate(
		cdp,
		`(() => {
      const button = document.querySelector("#payment-capture button.primary-button");
      if (!button || button.disabled) {
        return { ok: false, disabled: button?.disabled ?? null };
      }
      button.click();
      return { ok: true };
    })()`,
		"submit payment",
	);
	await waitForDashboard(
		(state) => state.payments.length > initialPaymentCount,
		"recorded payment",
	);

	await navigateTo(cdp, "documents", "#documents.documents-panel");
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector(".document-factory-selected-kind select") && document.querySelector(".document-payload-card")))()`,
		"documents factory form",
	);
	await evaluate(
		cdp,
		inputHelpersExpression(`
      const kind = document.querySelector(".document-factory-selected-kind select");
      if (kind) {
        setFieldValue(kind, "patient_intake_questionnaire");
      }
    `),
		"select patient intake document kind",
	);
	await waitFor(
		cdp,
		`Boolean(document.querySelector('[data-testid="btn-intake-fill-norm"]'))`,
		"patient intake form mounted",
	);
	const documentFormResult = await evaluate(
		cdp,
		inputHelpersExpression(`
      const fillNormBtn = document.querySelector('[data-testid="btn-intake-fill-norm"]');
      if (fillNormBtn) fillNormBtn.click();
      const card = document.querySelector(".document-payload-card");
      if (!card) {
        return { ok: false, reason: "missing_intake_card" };
      }
      const details = card.querySelector("details");
      if (details) details.open = true;
      const textareas = Array.from(card.querySelectorAll("textarea"));
      const values = [
        "Test complaint for smoke workflow",
        "No allergy reported in smoke workflow",
        "No regular medication reported",
        "No chronic conditions reported",
        "No anticoagulants reported",
        "No infectious risk reported",
        "No cardio endocrine risk reported",
        "Synthetic smoke note"
      ];
      textareas.forEach((textarea, index) => setFieldValue(textarea, values[index] ?? "Synthetic smoke value"));
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) checkbox.click();
      return { ok: true, textareaCount: textareas.length, checked: checkbox?.checked ?? null };
    `),
		"fill patient intake document",
	);
	if (
		!documentFormResult.ok ||
		documentFormResult.textareaCount < 7 ||
		documentFormResult.checked !== true
	) {
		throw new Error(
			`Patient intake form was not filled: ${JSON.stringify(documentFormResult)}`,
		);
	}
	await waitFor(
		cdp,
		`(() => {
      const button = document.querySelector(".document-factory-selected-kind button.primary-button");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
		"document create button",
	);
	await evaluate(
		cdp,
		`(() => {
      const button = document.querySelector(".document-factory-selected-kind button.primary-button");
      if (!button || button.disabled) {
        return { ok: false, disabled: button?.disabled ?? null };
      }
      button.click();
      return { ok: true };
    })()`,
		"create patient intake document",
	);
	await waitForDashboard(
		(state) =>
			state.documents.length > initialDocumentCount &&
			state.documents.some(
				(document) => document.kind === "patient_intake_questionnaire",
			),
		"created patient intake document",
	);

	await navigateTo(cdp, "visit", "#visit.visit-panel");
	await waitFor(
		cdp,
		`(() => Boolean(document.querySelector(".tooth-map")))()`,
		"tooth map",
	);
	const toothResult = await evaluate(
		cdp,
		`(() => {
      const watchTool = document.querySelector(".tooth-map-selected button");
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      if (!watchTool || !tooth24) {
        return { ok: false, hasWatchTool: Boolean(watchTool), hasTooth24: Boolean(tooth24) };
      }
      watchTool.click();
      tooth24.click();
      return { ok: true, tooth24Class: tooth24.className };
    })()`,
		"mark tooth 24",
	);
	if (!toothResult.ok) {
		throw new Error(`Tooth map action failed: ${JSON.stringify(toothResult)}`);
	}
	await waitFor(
		cdp,
		`(() => {
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      return tooth24 && tooth24.className.includes("tooth-watch") && tooth24.className.includes("selected")
        ? { tooth24Class: tooth24.className }
        : null;
    })()`,
		"tooth 24 watch marker",
	);

	const appointmentReason = `Smoke appointment ${Date.now()}`;
	const appointmentWindow = nextBusinessMorningWindow(
		initialDashboard.clinicSettings.profile.scheduleDefaults,
		initialDashboard.appointments,
	);
	const scheduleDoctor = initialDashboard.clinicSettings.staff.find(
		(member) =>
			member.active && (member.role === "doctor" || member.role === "owner"),
	);
	const scheduleAssistant = initialDashboard.clinicSettings.staff.find(
		(member) => member.active && member.role === "assistant",
	);
	const scheduleChair = initialDashboard.clinicSettings.chairs.find(
		(chair) => chair.active,
	);
	const assistantRequired =
		initialDashboard.clinicSettings.profile.mode !== "solo_doctor";
	if (!scheduleDoctor) {
		throw new Error(
			"No active doctor or owner found for schedule smoke action",
		);
	}
	if (!scheduleChair) {
		throw new Error("No active chair found for schedule smoke action");
	}
	if (assistantRequired && !scheduleAssistant) {
		throw new Error("No active assistant found for schedule smoke action");
	}

	await navigateTo(cdp, "schedule", "#schedule.schedule-panel");
	await evaluate(
		cdp,
		`(() => {
			const editor = document.querySelector(".appointment-create-editor, .appointment-create-wrapper");
			if (editor) return { ok: true, alreadyOpen: true };
			const optionsBtn = document.querySelector('[data-testid="schedule-toolbar-options-btn"]');
			if (optionsBtn) optionsBtn.click();
			return { ok: true, clickedOptions: Boolean(optionsBtn) };
		})()`,
	);
	await waitFor(
		cdp,
		`(() => {
			const editor = document.querySelector(".appointment-create-editor, .appointment-create-wrapper");
			if (editor) return true;
			const dictBtn = document.querySelector('[data-testid="schedule-options-dictation-btn"]');
			if (dictBtn) {
				dictBtn.click();
				return true;
			}
			return false;
		})()`,
		"open appointment create editor via options menu",
	);
	await waitFor(
		cdp,
		`(() => {
			const toggleBtn = document.querySelector('[data-schedule-create-toggle="true"]');
			if (toggleBtn && toggleBtn.getAttribute("aria-expanded") !== "true") {
				toggleBtn.click();
			}
			return Boolean(document.querySelector(".appointment-create-editor, .appointment-create-wrapper"));
		})()`,
		"appointment create editor",
	);
	await waitFor(
		cdp,
		`(() => {
			const editor = document.querySelector(".appointment-create-editor, .appointment-create-wrapper");
			const manualForm = editor?.querySelector(".appointment-manual-form") || editor;
			const dateInputs = manualForm?.querySelectorAll('input[type="datetime-local"]');
			return Boolean(dateInputs && dateInputs.length >= 2);
		})()`,
		"appointment manual form inputs",
	);
	const scheduleFormResult = await evaluate(
		cdp,
		inputHelpersExpression(`
      const editor = document.querySelector(".appointment-create-editor, .appointment-create-wrapper");
      if (!editor) {
        return { ok: false, reason: "missing_editor" };
      }
      const manualForm = editor.querySelector(".appointment-manual-form") || editor;
      const dateInputs = manualForm.querySelectorAll('input[type="datetime-local"]');
      if (dateInputs.length >= 2) {
        setFieldValue(dateInputs[0], ${JSON.stringify(appointmentWindow.startsAtLocal)});
        setFieldValue(dateInputs[1], ${JSON.stringify(appointmentWindow.endsAtLocal)});
      }

      // Patient: check for chip with patient name or select dropdown
      const patientChip = Array.from(manualForm.querySelectorAll(".quick-chip")).find(btn =>
        btn.textContent.includes(${JSON.stringify(activePatientName)})
      );
      if (patientChip) {
        patientChip.click();
      } else {
        const patientSelect = manualForm.querySelector("select");
        if (patientSelect) setFieldValue(patientSelect, ${JSON.stringify(initialDashboard.activeVisit.patientId)});
      }

      // Doctor: check for chip with doctor name or select
      const doctorChip = Array.from(manualForm.querySelectorAll(".quick-chip")).find(btn =>
        btn.textContent.includes(${JSON.stringify(scheduleDoctor.fullName)})
      );
      if (doctorChip) {
        doctorChip.click();
      } else {
        const doctorSelect = manualForm.querySelector('[data-testid="new-appointment-doctor-select"]');
        if (doctorSelect) setFieldValue(doctorSelect, ${JSON.stringify(scheduleDoctor.id)});
      }

      // Chair: click chair chip
      const chairChip = Array.from(manualForm.querySelectorAll(".quick-chip")).find(btn =>
        btn.textContent.includes(${JSON.stringify(scheduleChair.name)})
      );
      if (chairChip) {
        chairChip.click();
      }

      // Assistant: if assistant present, click assistant chip
      if (${JSON.stringify(scheduleAssistant?.fullName ?? null)}) {
        const assistantChip = Array.from(manualForm.querySelectorAll(".quick-chip")).find(btn =>
          btn.textContent.includes(${JSON.stringify(scheduleAssistant?.fullName)})
        );
        if (assistantChip) assistantChip.click();
      }

      // Reason: input
      const reasonLabel = Array.from(manualForm.querySelectorAll("label")).find(l => l.textContent.includes("Причина"));
      const reasonInput = reasonLabel?.querySelector("input") || manualForm.querySelector('input:not([type="datetime-local"]):not([type="checkbox"])');
      if (reasonInput) {
        setFieldValue(reasonInput, ${JSON.stringify(appointmentReason)});
      }

      // Comment: textarea
      const textarea = manualForm.querySelector("textarea");
      if (textarea) {
        setFieldValue(textarea, "Synthetic schedule smoke appointment");
      }

      const button = editor.querySelector('button[data-testid="create-appointment-button"], .appointment-editor-actions button.primary-button, button.primary-button');
      return { ok: true, disabled: button?.disabled ?? null };
    `),
		"fill appointment create form",
	);
	if (!scheduleFormResult.ok) {
		throw new Error(
			`Appointment create form was not filled: ${JSON.stringify(scheduleFormResult)}`,
		);
	}
	await waitFor(
		cdp,
		`(() => {
      const button = document.querySelector('.appointment-create-editor button[data-testid="create-appointment-button"], .appointment-create-wrapper button[data-testid="create-appointment-button"], button[data-testid="create-appointment-button"], .appointment-create-editor button.primary-button');
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
		"appointment create button",
	);
	await evaluate(
		cdp,
		`(() => {
      const button = document.querySelector('.appointment-create-editor button[data-testid="create-appointment-button"], .appointment-create-wrapper button[data-testid="create-appointment-button"], button[data-testid="create-appointment-button"], .appointment-create-editor button.primary-button');
      if (!button || button.disabled) {
        return { ok: false, disabled: button?.disabled ?? null };
      }
      button.click();
      return { ok: true };
    })()`,
		"create appointment",
	);
	await sleep(1000);
	const editorState = await evaluate(
		cdp,
		`(() => {
      const errorEl = document.querySelector(".appointment-create-wrapper .save-error, .appointment-editor-actions .save-error");
      const stateEl = document.querySelector(".appointment-create-wrapper .save-state, .appointment-editor-actions .save-state");
      const missingEl = document.querySelector("#new-appointment-create-missing");
      return {
        errorText: errorEl ? errorEl.textContent.trim() : null,
        stateText: stateEl ? stateEl.textContent.trim() : null,
        missingText: missingEl ? missingEl.textContent.trim() : null
      };
    })()`,
	);
	console.log(
		"Appointment Editor state after click:",
		JSON.stringify(editorState),
	);
	await waitForDashboard(
		(state) =>
			state.appointments.length > initialAppointmentCount &&
			state.appointments.some(
				(appointment) => appointment.reason === appointmentReason,
			),
		"created appointment",
	);
	const appointmentDate = appointmentWindow.startsAtLocal.split("T")[0];
	await evaluate(
		cdp,
		inputHelpersExpression(`
			const dateInput = document.querySelector(".schedule-date-input");
			if (dateInput && dateInput.value !== ${JSON.stringify(appointmentDate)}) {
				setFieldValue(dateInput, ${JSON.stringify(appointmentDate)});
			}
		`),
		"switch schedule date to appointment date",
	);
	await waitFor(
		cdp,
		`(() => Array.from(document.querySelectorAll("#schedule .appointment-card, #schedule [data-appointment-id], #schedule [data-testid*='appointment-card'], #schedule .timeline .appointment-row, #schedule .timeline p, #schedule .schedule-grid-slot")).some((node) =>
      node.textContent.includes(${JSON.stringify(appointmentReason)})
    ))()`,
		"created appointment visible in UI",
	);

	if (!openCommunicationTask) {
		throw new Error(
			"No open communication task found for communication smoke action",
		);
	}
	await navigateTo(
		cdp,
		"communications",
		"#communications.communications-panel",
	);
	await waitFor(
		cdp,
		`(() => document.querySelectorAll(".communication-task").length > 0)()`,
		"communication task list",
	);
	const communicationResult = await evaluate(
		cdp,
		inputHelpersExpression(`
      const note = document.querySelector("#communication-closing-note");
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!note || !card) {
        return { ok: false, hasNote: Boolean(note), hasCard: Boolean(card) };
      }
      setFieldValue(note, "Synthetic communication close note");
      const chip = card.querySelector('[data-testid="communication-outcome-promised_payment"]') ||
        card.querySelector('[data-testid="communication-outcome-reschedule_requested"]') ||
        Array.from(card.querySelectorAll(".communication-outcome-select .quick-chip, .communication-outcome-select button")).find(b => b.textContent.includes("Обещал оплату") || b.textContent.includes("Перенос записи")) ||
        card.querySelector(".communication-outcome-select .quick-chip");
      if (chip) chip.click();
      return { ok: true, hasChip: Boolean(chip) };
    `),
		"fill communication task completion",
	);
	console.log("fill communicationResult:", JSON.stringify(communicationResult));
	if (!communicationResult.ok) {
		throw new Error(
			`Communication task completion form was not filled: ${JSON.stringify(communicationResult)}`,
		);
	}
	const outcomeWaitResult = await waitFor(
		cdp,
		`(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!card) {
        return null;
      }
      const selectedChip = card.querySelector(".communication-outcome-select .quick-chip.selected");
      const closeButton = card.querySelector('[data-testid="communication-task-complete-btn"]') ||
        Array.from(card.querySelectorAll(".communication-task-actions button")).find(b => b.textContent.includes("Закрыть") || b.textContent.includes("Закрываю"));
      return selectedChip && closeButton && !closeButton.disabled ? { outcome: selectedChip.textContent.trim() } : null;
    })()`,
		"communication outcome selected and close button ready",
	);
	console.log("outcomeWaitResult:", JSON.stringify(outcomeWaitResult));
	const completeResult = await evaluate(
		cdp,
		`(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!card) {
        return { ok: false, reason: "missing_card" };
      }
      const closeButton = card.querySelector('[data-testid="communication-task-complete-btn"]') ||
        Array.from(card.querySelectorAll(".communication-task-actions button")).find(b => b.textContent.includes("Закрыть") || b.textContent.includes("Закрываю"));
      if (!closeButton || closeButton.disabled) {
        return { ok: false, disabled: closeButton?.disabled ?? null };
      }
      closeButton.click();
      return { ok: true, buttonText: closeButton.textContent.trim() };
    })()`,
		"complete communication task",
	);
	console.log("completeResult:", JSON.stringify(completeResult));
	await waitForDashboard(
		(state) =>
			state.communicationEvents.length > initialCommunicationEventCount &&
			state.communicationTasks.some(
				(task) =>
					task.id === openCommunicationTask.id && task.status === "completed",
			),
		"completed communication task",
	);
	await waitFor(
		cdp,
		`(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      return card && card.querySelector(".status-completed") ? true : null;
    })()`,
		"completed communication task visible in UI",
	);

	const patientTimestamp = Date.now();
	const phoneSuffix = String(patientTimestamp).slice(-7);
	const patientName = `Смоуков${phoneSuffix} Иван Петрович`;
	const patientPhone = `+7 999 ${phoneSuffix.slice(0, 3)}-${phoneSuffix.slice(3, 5)}-${phoneSuffix.slice(5, 7)}`;
	const birthYear = 1970 + (patientTimestamp % 30);
	const birthMonth = String(1 + (patientTimestamp % 12)).padStart(2, "0");
	const birthDay = String(1 + (patientTimestamp % 28)).padStart(2, "0");
	const patientBirthDate = `${birthYear}-${birthMonth}-${birthDay}`;
	await navigateTo(cdp, "patients", "#patients.patients-panel");

	// Open creation modal if not already open
	await evaluate(
		cdp,
		`(() => {
			const openModalBtn = document.querySelector('[data-testid="open-create-patient-modal-btn"], .patients-new-patient-btn');
			if (openModalBtn) openModalBtn.click();
		})()`,
		"open patient create modal",
	);

	await waitFor(
		cdp,
		`(() => {
			const nameInput = document.querySelector("#patient-create-full-name") || document.querySelector("#patients .quick-create input");
			const phoneInput = document.querySelector("#patient-create-phone") || document.querySelectorAll("#patients .quick-create input")[1];
			const birthInput = document.querySelector("#patient-create-birth-date") || document.querySelectorAll("#patients .quick-create input")[2];
			const button = document.querySelector('[data-testid="patient-creation-submit-btn"], .quick-create-action, #patients .quick-create-action');
			return nameInput && phoneInput && birthInput && button ? true : null;
		})()`,
		"patient create form ready",
	);

	const patientCreateResult = await evaluate(
		cdp,
		inputHelpersExpression(`
			const nameInput = document.querySelector("#patient-create-full-name") || document.querySelector("#patients .quick-create input");
			const phoneInput = document.querySelector("#patient-create-phone") || document.querySelectorAll("#patients .quick-create input")[1];
			const birthInput = document.querySelector("#patient-create-birth-date") || document.querySelectorAll("#patients .quick-create input")[2];
			const button = document.querySelector('[data-testid="patient-creation-submit-btn"], .quick-create-action, #patients .quick-create-action');
			if (!nameInput || !phoneInput || !birthInput || !button) {
				return { ok: false, hasName: Boolean(nameInput), hasPhone: Boolean(phoneInput), hasBirth: Boolean(birthInput), hasButton: Boolean(button) };
			}
			setFieldValue(nameInput, ${JSON.stringify(patientName)});
			setFieldValue(phoneInput, ${JSON.stringify(patientPhone)});
			setFieldValue(birthInput, ${JSON.stringify(patientBirthDate)});
			if (window.__PATIENT_STORE__) {
				window.__PATIENT_STORE__.getState().setNewPatientName(${JSON.stringify(patientName)});
				window.__PATIENT_STORE__.getState().setNewPatientPhone(${JSON.stringify(patientPhone)});
				window.__PATIENT_STORE__.getState().setNewPatientBirthDate(${JSON.stringify(patientBirthDate)});
			}
			return {
				ok: true,
				disabled: button.disabled,
				nameVal: nameInput.value,
				phoneVal: phoneInput.value,
				birthVal: birthInput.value,
				storeHasName: window.__PATIENT_STORE__ ? window.__PATIENT_STORE__.getState().newPatientName : null,
			};
		`),
		"fill patient create form",
	);
	if (!patientCreateResult.ok) {
		throw new Error(
			`Patient create form was not filled: ${JSON.stringify(patientCreateResult)}`,
		);
	}
	await waitFor(
		cdp,
		`(() => {
			const button = document.querySelector('[data-testid="patient-creation-submit-btn"], .quick-create-action, #patients .quick-create-action');
			return button && !button.disabled ? { text: button.textContent.trim() } : null;
		})()`,
		"patient create button ready",
	);
	await evaluate(
		cdp,
		`(() => {
			const button = document.querySelector('[data-testid="patient-creation-submit-btn"], .quick-create-action, #patients .quick-create-action');
			if (!button || button.disabled) {
				return { ok: false, disabled: button?.disabled ?? null };
			}
			button.click();
			return { ok: true };
		})()`,
		"create patient",
	);
	await waitForDashboard(
		(state) =>
			state.patients.some((patient) => patient.fullName === patientName),
		"created patient",
	);
	await waitFor(
		cdp,
		`(() => Array.from(document.querySelectorAll("#patients .patient-row h3")).some((heading) => heading.textContent.trim() === ${JSON.stringify(
			patientName,
		)}))()`,
		"created patient visible in UI",
	);

	await navigateTo(cdp, "imaging", "#imaging.imaging-panel");
	await setFileInputFiles(
		cdp,
		'[data-testid="imaging-browser-local-files-input"]',
		fixtureFiles,
	);
	let imagingResult;
	try {
		imagingResult = await waitFor(
			cdp,
			`(() => {
        const status = document.querySelector('[data-testid="imaging-upload-status"]');
        if (!status) {
          return null;
        }
        const text = status.innerText;
        const dicomLike = /DICOM|КТ|РљРў/.test(text);
        return text.includes("3") && dicomLike ? { text } : null;
      })()`,
			"imaging file upload status",
			120,
		);
	} catch (error) {
		const diag = await evaluate(
			cdp,
			`(() => {
        const status = document.querySelector('[data-testid="imaging-upload-status"]');
        const alert = document.querySelector('.workspace-route-error, .default-clinic-banner, [role="alert"]');
        const appError = document.querySelector('.app-error-banner, .error-message');
        const bodyText = document.body.innerText;
        return {
          statusExists: Boolean(status),
          statusHtml: status ? status.outerHTML : null,
          alertText: alert ? alert.textContent.trim() : null,
          appErrorText: appError ? appError.textContent.trim() : null,
          bodyTextLength: bodyText.length,
          bodyTextPrefix: bodyText.slice(0, 1000)
        };
      })()`,
		);
		console.error(
			"DIAGNOSTICS ON IMAGING UPLOAD FAILURE:",
			JSON.stringify(diag, null, 2),
		);
		throw error;
	}

	const finalScreenshot = await saveScreenshot(cdp, "final-imaging");
	cdp.close();

	const finalDashboard = await dashboard();
	const createdPayment = finalDashboard.payments.find(
		(payment) => payment.amountRub === 1200,
	);
	const createdDocument = finalDashboard.documents.find(
		(document) => document.kind === "patient_intake_questionnaire",
	);
	const createdPatient = finalDashboard.patients.find(
		(patient) => patient.fullName === patientName,
	);
	const createdAppointment = finalDashboard.appointments.find(
		(appointment) => appointment.reason === appointmentReason,
	);
	const completedCommunicationTask = finalDashboard.communicationTasks.find(
		(task) =>
			task.id === openCommunicationTask.id && task.status === "completed",
	);

	if (!createdPayment) {
		throw new Error("Recorded payment was not found in final dashboard");
	}
	if (!createdDocument) {
		throw new Error(
			"Created patient intake document was not found in final dashboard",
		);
	}
	if (!createdPatient) {
		throw new Error("Created patient was not found in final dashboard");
	}
	if (!createdAppointment) {
		throw new Error("Created appointment was not found in final dashboard");
	}
	if (!completedCommunicationTask) {
		throw new Error(
			"Completed communication task was not found in final dashboard",
		);
	}

	console.log(
		JSON.stringify({
			ok: true,
			guard: "workspace-live-core-actions",
			isolatedApi: apiBaseUrl,
			isolatedWeb: webBaseUrl,
			activePatientName,
			createdPatientId: createdPatient.id,
			createdAppointmentId: createdAppointment.id,
			completedCommunicationTaskId: completedCommunicationTask.id,
			createdDocumentId: createdDocument.id,
			createdPaymentId: createdPayment.id,
			imagingStatusTextLength: imagingResult.text.length,
			screenshot: finalScreenshot,
		}),
	);
} catch (error) {
	console.error("SMOKE TEST FAILED:", error);
	console.error("--- API PROCESS STDOUT ---");
	console.error(apiProcess.stdout());
	console.error("--- API PROCESS STDERR ---");
	console.error(apiProcess.stderr());
	console.error("--- WEB PROCESS STDOUT ---");
	console.error(webProcess.stdout());
	console.error("--- WEB PROCESS STDERR ---");
	console.error(webProcess.stderr());
	throw error;
} finally {
	await stopTracked(browserProcess);
	await stopTracked(webProcess);
	await stopTracked(apiProcess);
	await rm(tempRoot, {
		recursive: true,
		force: true,
		maxRetries: 5,
		retryDelay: 250,
	});
}
