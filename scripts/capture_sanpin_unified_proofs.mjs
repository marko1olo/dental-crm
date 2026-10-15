import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluate } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { spawnTracked, stopTracked } from "./lib/processTracking.mjs";
import { sleep } from "./lib/sleep.mjs";

const CONV_ID = "9104d06d-b4fb-4997-8055-920978190791";
const OUT_BRAIN = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const OUT_DOCS_SANPIN = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const OUT_DOCS_SSOT = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin_ssot";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9244;

await mkdir(OUT_BRAIN, { recursive: true });
await mkdir(OUT_DOCS_SANPIN, { recursive: true });
await mkdir(OUT_DOCS_SSOT, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const devicesPreset = [
	{
		id: "AUTO-01",
		brandModelRu: "Melag Vacuklav 23 B+ (ЦСО №1)",
		serialNumber: "MEL-2024-9812",
		inventoryNumber: "ИНВ-ЦСО-001",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 22,
		locationRu: "Центральное стерилизационное отделение (ЦСО)",
		lastMaintenanceDate: "2026-06-01",
		nextMaintenanceDate: "2026-12-01",
		isOperational: true,
		notes: "Класс B с фракционированным вакуумом",
	},
	{
		id: "AUTO-02",
		brandModelRu: "W&H Lina 17 (Австрия)",
		serialNumber: "WH-2023-4410",
		inventoryNumber: "ИНВ-ЦСО-002",
		deviceType: "autoclave_class_b",
		chamberVolumeLiters: 17,
		locationRu: "ЦСО (Стерилизационная)",
		lastMaintenanceDate: "2026-05-15",
		nextMaintenanceDate: "2026-11-15",
		isOperational: true,
		notes: "Автоклав класса B для наконечников и инструментов",
	},
];

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	`sanpin-unified-profile-${Date.now()}`,
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
		`${webBaseUrl}/?demo=true#sanpin`,
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
		const buffer = Buffer.from(data, "base64");
		await writeFile(path.join(OUT_BRAIN, `${name}.png`), buffer);
		await writeFile(path.join(OUT_DOCS_SANPIN, `${name}.png`), buffer);
		await writeFile(path.join(OUT_DOCS_SSOT, `${name}.png`), buffer);
		console.log(`Saved screenshot: ${name}.png (Brain & Docs)`);
	}

	await sleep(2000);

	const NOW = new Date().toISOString();
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
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dental-crm:web-ui-preferences:v1", ${JSON.stringify(prefs)});
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_current_view", "sanpin");
		localStorage.setItem("dente_last_view", "sanpin");
		localStorage.setItem("dente_clinic_autoclaves_v1", ${JSON.stringify(JSON.stringify(devicesPreset))});
		window.location.hash = "#sanpin";
		location.reload();
	`,
	);
	await sleep(2500);

	// Quick login if needed
	await evaluate(
		cdp,
		`(() => {
			const buttons = Array.from(document.querySelectorAll('button'));
			const demoBtn = buttons.find(b => b.textContent && b.textContent.includes('Быстрый вход в Демо-тур'));
			if (demoBtn) demoBtn.click();
		})()`,
	);
	await sleep(2000);

	// Enter PIN 1111 if needed
	await evaluate(
		cdp,
		`(() => {
			const buttons = Array.from(document.querySelectorAll('button'));
			const oneBtn = buttons.find(b => b.textContent && b.textContent.trim() === '1');
			if (oneBtn) {
				for (let i = 0; i < 4; i++) {
					setTimeout(() => oneBtn.click(), i * 150);
				}
			}
		})()`,
	);
	await sleep(2000);

	// Remove overlays, tours
	await evaluate(
		cdp,
		`(() => {
			document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
			const b = Array.from(document.querySelectorAll('button, div')).find(el => el.textContent && el.textContent.includes('Сначала осмотреться'));
			if (b) b.click();
		})()`,
	);
	await sleep(1500);

	// Navigate to SanPiN & Autoclave tab
	await evaluate(
		cdp,
		`(() => {
			window.location.hash = '#sanpin';
			const btns = Array.from(document.querySelectorAll('button, a'));
			const sanpinNav = btns.find(b => b.textContent && (b.textContent.includes('СанПиН') || b.textContent.includes('Стерилизация')));
			if (sanpinNav) sanpinNav.click();
		})()`,
	);
	await sleep(1500);

	// Ensure Autoclave tab
	await evaluate(
		cdp,
		`(() => {
			const btns = Array.from(document.querySelectorAll('button'));
			const tabBtn = btns.find(b => b.textContent && (b.textContent.includes('Автоклавы') || b.textContent.includes('Журнал работы стерилизаторов')));
			if (tabBtn) tabBtn.click();
			const subtabBtn = document.querySelector('[data-testid="subtab-journal-btn"]');
			if (subtabBtn) subtabBtn.click();
		})()`,
	);
	// Wait until CRM finishes loading and .sanpin-cycles-container is mounted
	console.log("Waiting for sanpin-cycles-container to mount...");
	for (let i = 0; i < 40; i++) {
		const isMounted = await evaluate(
			cdp,
			`(() => {
				const container = document.querySelector('.sanpin-cycles-container');
				const table = document.querySelector('.sanpin-desktop-table table');
				return !!(container && table);
			})()`,
		);
		if (isMounted) {
			console.log(`Mounted after ${i * 500}ms!`);
			break;
		}
		// Also re-attempt clicking sanpin tab if still on loading screen or dashboard
		await evaluate(
			cdp,
			`(() => {
				const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Быстрый вход в Демо-тур'));
				if (demoBtn) demoBtn.click();
				const subtabBtn = document.querySelector('[data-testid="subtab-journal-btn"]');
				if (subtabBtn) subtabBtn.click();
			})()`,
		);
		await sleep(500);
	}

	// Remove any toasts or alerts
	await evaluate(
		cdp,
		`(() => {
			document.querySelectorAll('.global-toast, [role="alert"]').forEach(el => el.remove());
		})()`,
	);
	await sleep(1000);

	// =========================================================================
	// 1. PC LIGHT (1440x900)
	// =========================================================================
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 1440,
		height: 900,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "light" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "light")`);
	await sleep(1500);
	await shot("pc_light_sanpin_sterilization_1440x900");

	// =========================================================================
	// 2. PC DARK (1440x900)
	// =========================================================================
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "dark")`);
	await sleep(1500);
	await shot("pc_dark_sanpin_sterilization_1440x900");

	// =========================================================================
	// 3. MOBILE LIGHT (390x844)
	// =========================================================================
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 390,
		height: 844,
		deviceScaleFactor: 2,
		mobile: true,
	});
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "light" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "light")`);
	await sleep(1500);
	await shot("mobile_light_sanpin_sterilization_390x844");

	// =========================================================================
	// 4. MOBILE DARK (390x844)
	// =========================================================================
	await cdp.send("Emulation.setEmulatedMedia", {
		features: [{ name: "prefers-color-scheme", value: "dark" }],
	});
	await evaluate(cdp, `document.documentElement.setAttribute("data-theme", "dark")`);
	await sleep(1500);
	await shot("mobile_dark_sanpin_sterilization_390x844");

	cdp.close();
	console.log("All 4 sterilization canonical screenshots successfully captured!");
} finally {
	await stopTracked(browserProcess);
}
