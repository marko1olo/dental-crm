import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluate, waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { spawnTracked, stopTracked } from "./lib/processTracking.mjs";
import { sleep } from "./lib/sleep.mjs";

const OUT = "C:/Users/Admin/.gemini/antigravity/brain/15ff02cd-7431-4f01-a3cb-4ef7952d86bb";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9229;

await mkdir(OUT, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"sanpin-screenshots-profile",
);
await mkdir(tmpProfile, { recursive: true });

const browserProcess = spawnTracked(
	"browser",
	browserPath,
	[
		"--headless=new",
		"--disable-gpu",
		"--disable-dev-shm-usage",
		"--no-first-run",
		"--remote-allow-origins=*",
		`--remote-debugging-port=${cdpPort}`,
		`--user-data-dir=${tmpProfile}`,
		`${webBaseUrl}/#scanner`,
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);

try {
	const targets = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 60);
	const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
	if (!pageTarget?.webSocketDebuggerUrl)
		throw new Error("No page CDP target found");

	const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
	let id = 0;
	const pending = new Map();
	socket.onmessage = (event) => {
		const message = JSON.parse(event.data);
		if (!message.id) return;
		const request = pending.get(message.id);
		if (!request) return;
		pending.delete(message.id);
		if (message.error) request.reject(new Error(message.error.message));
		else request.resolve(message.result);
	};
	await new Promise((resolve, reject) => {
		socket.onopen = resolve;
		socket.onerror = () => reject(new Error("CDP failed"));
	});

	const cdp = {
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

	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");

	async function shot(name) {
		const { data } = await cdp.send("Page.captureScreenshot", {
			format: "png",
			captureBeyondViewport: false,
		});
		await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
		console.log(`Screenshot saved: ${name}.png`);
	}

	await sleep(2000);

	const NOW = new Date().toISOString();
	const orgId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
	const userId = "8356141b-7cfa-4221-95f7-70f47e7344b1"; // Doctor

	const { signToken } = await import("../apps/api/dist/utils/cryptoHelper.js");
	const { authTokenSecret } = await import("../apps/api/dist/security/authSecret.js");
	const secret = authTokenSecret();

	const clinicToken = signToken(
		{ organizationId: orgId, clinicName: "Стоматология" },
		secret,
		86400,
	);
	const staffToken = signToken(
		{ userId, fullName: "Главный Врач", role: "doctor", organizationId: orgId },
		secret,
		86400,
	);

	const prefs = JSON.stringify({
		version: 1,
		onboardingDismissed: true,
		onboardingDraftMode: false,
		onboardingStep: "done",
		onboardingDismissedAt: NOW,
		savedAt: NOW,
	});

	await evaluate(
		cdp,
		`
		localStorage.setItem("dente_clinic_token", "${clinicToken}");
		localStorage.setItem("dente_staff_token", "${staffToken}");
		localStorage.setItem("dental-crm:web-ui-preferences:v1", ${JSON.stringify(prefs)});
		window.location.hash = "#scanner";
		location.reload();
	`,
	);
	await sleep(3000);

	// Click "Сначала осмотреться" if button still appears
	await evaluate(
		cdp,
		`(() => {
			const b = Array.from(document.querySelectorAll('button, div')).find(el => el.textContent && el.textContent.includes('Сначала осмотреться'));
			if (b) b.click();
		})()`,
	);
	await sleep(1500);

	// Ensure we are in scanner view
	await evaluate(
		cdp,
		`window.location.hash = "#scanner";`,
	);
	await sleep(2000);

	// PC Viewport (1440x900)
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 1440,
		height: 900,
		deviceScaleFactor: 1,
		mobile: false,
	});

	// Light mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "light" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "light")`);
	await sleep(1500);
	await shot("Sanpin_PC_Light");

	// Dark mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "dark")`);
	await sleep(1500);
	await shot("Sanpin_PC_Dark");

	// Mobile Viewport (375x812)
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 375,
		height: 812,
		deviceScaleFactor: 2,
		mobile: true,
	});

	// Light mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "light" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "light")`);
	await sleep(1500);
	await shot("Sanpin_Mobile_Light");

	// Dark mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "dark")`);
	await sleep(1500);
	await shot("Sanpin_Mobile_Dark");

	cdp.close();
} finally {
	await stopTracked(browserProcess);
}
