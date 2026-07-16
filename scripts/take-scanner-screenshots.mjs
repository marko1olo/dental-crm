import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluate, waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { spawnTracked, stopTracked } from "./lib/processTracking.mjs";
import { sleep } from "./lib/sleep.mjs";

const OUT =
	"C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9227;

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"scanner-screenshots-profile",
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
			captureBeyondViewport: true,
		});
		await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
		console.log(`Screenshot saved: ${name}.png`);
	}

	// Wait for AuthHub or app-shell or ScannerView
	await waitFor(
		cdp,
		`(() => !!(document.querySelector(".app-shell") || document.querySelector("input[type='email']") || document.querySelector("h1")))()`,
		"auth or app shell",
	);
	await sleep(1000);
	await sleep(1000);

	// Inject token if missing and reload
	const needsAuth = await evaluate(
		cdp,
		`(() => !localStorage.getItem("dente_clinic_token"))()`,
	);
	if (needsAuth) {
		console.log("Injecting auth tokens directly...");
		// We can generate valid tokens since we have access to the codebase
		const orgId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
		const userId = "8356141b-7cfa-4221-95f7-70f47e7344b1"; // Doctor

		// Inject token script that runs crypto on server side
		const { signToken } = await import(
			"../apps/api/dist/utils/cryptoHelper.js"
		);
		const { configuredAuthTokenSecret } = await import(
			"../apps/api/dist/accessGuard.js"
		);
		const secret = configuredAuthTokenSecret();

		const clinicToken = signToken(
			{ organizationId: orgId, clinicName: "Стоматология" },
			secret,
			86400,
		);
		const staffToken = signToken(
			{ userId, fullName: "Doctor", role: "doctor", organizationId: orgId },
			secret,
			86400,
		);

		await evaluate(
			cdp,
			`
      localStorage.setItem("dente_clinic_token", "${clinicToken}");
      localStorage.setItem("dente_staff_token", "${staffToken}");
      location.reload();
    `,
		);
		await sleep(2000);
	}

	// Wait for app to render ScannerView (look for h1 with text or the ScanLine svg container)
	await waitFor(
		cdp,
		`(() => document.readyState === "complete" && Boolean(document.querySelector("h1")))()`,
		"scanner view",
	);
	await sleep(3000);

	// Set to PC
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
	await sleep(1000);
	await shot("Scanner_PC_Light");

	// Dark mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await sleep(1000);
	await shot("Scanner_PC_Dark");

	// Mobile
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 375,
		height: 812,
		deviceScaleFactor: 3,
		mobile: true,
	});
	// Light mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "light" }],
	});
	await sleep(1000);
	await shot("Scanner_Mobile_Light");

	// Dark mode
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await sleep(1000);
	await shot("Scanner_Mobile_Dark");

	cdp.close();
} finally {
	await stopTracked(browserProcess);
}
