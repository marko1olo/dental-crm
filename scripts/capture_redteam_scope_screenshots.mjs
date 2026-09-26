import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/c7e52fe4-8a10-4f33-958d-3070991818f7/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/schedule_redteam_4state";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9249;

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"screenshot-schedule-redteam-profile-v2",
);
await mkdir(tmpProfile, { recursive: true });

const browser = spawn(
	browserPath,
	[
		"--headless=new",
		"--disable-gpu",
		"--disable-dev-shm-usage",
		"--no-first-run",
		"--remote-allow-origins=*",
		`--remote-debugging-port=${cdpPort}`,
		`--user-data-dir=${tmpProfile}`,
		`--window-size=1440,900`,
		`${webBaseUrl}/`,
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTargets(retries = 30) {
	for (let i = 0; i < retries; i++) {
		try {
			const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
			const t = await r.json();
			if (t.length) return t;
		} catch {}
		await sleep(1000);
	}
	throw new Error("CDP not ready");
}

let targets;
try {
	targets = await getTargets();
} catch (e) {
	browser.kill();
	throw e;
}

const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
socket.onmessage = (ev) => {
	const msg = JSON.parse(ev.data);
	if (!msg.id) return;
	const req = pending.get(msg.id);
	if (!req) return;
	pending.delete(msg.id);
	if (msg.error) req.reject(new Error(msg.error.message));
	else req.resolve(msg.result);
};

await new Promise((res, rej) => {
	socket.onopen = res;
	socket.onerror = () => rej(new Error("WS connection failed"));
});

const cdp = {
	send(method, params = {}) {
		id++;
		socket.send(JSON.stringify({ id, method, params }));
		return new Promise((res, rej) =>
			pending.set(id, { resolve: res, reject: rej }),
		);
	},
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const mockDashboard = {
	organization: {
		id: "org-dente-demo",
		name: "Клиника DENTE",
	},
	clinicSettings: {
		name: "Клиника DENTE",
		profile: {
			mode: "clinic",
			timezone: "Europe/Moscow",
		},
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1 (Терапия)",
				roomNumber: "1",
				room: "1",
				active: true,
				isActive: true,
				color: "#0d9488",
				colorId: "teal",
			},
			{
				id: "chair-2",
				name: "Кресло 2 (Хирургия)",
				roomNumber: "2",
				room: "2",
				active: true,
				isActive: true,
				color: "#3b82f6",
				colorId: "blue",
			},
		],
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				active: true,
				specialties: ["therapy"],
			},
			{
				id: "doc-2",
				fullName: "Д-р Смирнова Анна Павловна",
				role: "doctor",
				active: true,
				specialties: ["surgery"],
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Петров Пётр Сергеевич",
			phone: "+7 (916) 123-45-67",
			status: "active",
			balanceRub: 0,
		},
		{
			id: "pat-2",
			fullName: "Васильева Ольга Игоревна",
			phone: "+7 (926) 555-43-21",
			status: "active",
			balanceRub: 12000,
		},
		{
			id: "pat-3",
			fullName: "Кузнецов Андрей Николаевич",
			phone: "+7 (903) 777-11-22",
			status: "active",
			balanceRub: -2500,
		},
		{
			id: "pat-4",
			fullName: "Михайлова Елена Викторовна",
			phone: "+7 (915) 888-33-44",
			status: "active",
			balanceRub: 0,
		},
	],
	appointments: [
		{
			id: "appt-1",
			organizationId: "org-dente-demo",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			patientId: "pat-1",
			startsAt: `${todayIso}T08:30:00+03:00`,
			endsAt: `${todayIso}T09:30:00+03:00`,
			status: "completed",
			reason: "Лечение пульпита 16 зуба",
			costRub: 6500,
			isCito: false,
		},
		{
			id: "appt-2",
			organizationId: "org-dente-demo",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			patientId: "pat-2",
			startsAt: `${todayIso}T10:00:00+03:00`,
			endsAt: `${todayIso}T11:00:00+03:00`,
			status: "in_treatment",
			reason: "Установка коронки E-max",
			costRub: 18000,
			isCito: false,
		},
		{
			id: "appt-3-cito",
			organizationId: "org-dente-demo",
			chairId: "chair-1",
			doctorUserId: "doc-1",
			patientId: "pat-3",
			startsAt: `${todayIso}T10:00:00+03:00`,
			endsAt: `${todayIso}T10:30:00+03:00`,
			status: "arrived",
			reason: "Острая боль (CITO!)",
			costRub: 3500,
			isCito: true,
			cito: true,
			isEmergency: true,
		},
		{
			id: "appt-4",
			organizationId: "org-dente-demo",
			chairId: "chair-2",
			doctorUserId: "doc-2",
			patientId: "pat-4",
			startsAt: `${todayIso}T09:00:00+03:00`,
			endsAt: `${todayIso}T10:00:00+03:00`,
			status: "confirmed",
			reason: "Удаление зуба мудрости 38",
			costRub: 8000,
			isCito: false,
		},
	],
	rooms: [],
	cashRegisters: [],
	priceList: [],
	shiftIntelligence: {
		scheduleWarnings: [],
	},
};

const mockShifts = [
	{
		id: `shift-doc-1-${todayIso}`,
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А.В.",
		doctorRole: "therapist",
		assistantId: null,
		assistantName: null,
		cabinetId: "chair-1",
		chairId: "chair-1",
		dateIso: todayIso,
		archetypeId: "first_shift",
		startTime: "08:00",
		endTime: "14:00",
		durationHours: 6,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		status: "confirmed",
	},
	{
		id: `shift-doc-2-${todayIso}`,
		doctorId: "doc-2",
		doctorName: "Д-р Смирнова А.П.",
		doctorRole: "surgeon",
		assistantId: null,
		assistantName: null,
		cabinetId: "chair-2",
		chairId: "chair-2",
		dateIso: todayIso,
		archetypeId: "first_shift",
		startTime: "08:00",
		endTime: "14:00",
		durationHours: 6,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		status: "confirmed",
	},
];

const mockMaintenance = [
	{
		id: `maint-sanpin-${todayIso}-0930`,
		chairId: "chair-1",
		startsAt: `${todayIso}T09:30:00+03:00`,
		endsAt: `${todayIso}T09:45:00+03:00`,
		reason: "sanitation",
		note: "Санитарный буфер (СанПиН 3.3686-21)",
	},
];

await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
	source: `(() => {
		const mockData = ${JSON.stringify(mockDashboard)};
		const origFetch = window.fetch;
		window.fetch = async function(url, opts) {
			if (typeof url === 'string' && url.includes('/api/dashboard')) {
				return new Response(JSON.stringify(mockData), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return origFetch.apply(this, arguments);
		};
		try {
			localStorage.setItem('dente_clinic_token', 'demo-clinic-token-123');
			localStorage.setItem('dente_staff_token', 'demo-staff-token-123');
			localStorage.setItem('dente_onboarding_completed', 'true');
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, step: 'done', completed: true }));
			localStorage.setItem('dental-crm:web-ui-preferences:v1', JSON.stringify({ version: 1, uiLanguage: 'ru', selectedWorkspaceRole: 'doctor', onboardingDismissed: true }));
			localStorage.setItem('dente_doctor_shifts', JSON.stringify(${JSON.stringify(mockShifts)}));
			localStorage.setItem('dente_schedule_chair_maintenance_blocks', JSON.stringify(${JSON.stringify(mockMaintenance)}));
		} catch (e) {}
	})()`,
});

async function setViewport(width, height, isMobile = false) {
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: isMobile ? 2 : 1,
		mobile: isMobile,
	});
	await sleep(500);
}

async function setTheme(theme) {
	await cdp.send("Runtime.evaluate", {
		expression: `(() => {
			document.documentElement.setAttribute('data-theme', '${theme}');
			document.body.setAttribute('data-theme', '${theme}');
			localStorage.setItem('dente_theme', '${theme}');
			return document.documentElement.getAttribute('data-theme');
		})()`,
		returnByValue: true,
	});
	await sleep(600);
}

async function nav(hash) {
	await cdp.send("Runtime.evaluate", {
		expression: `window.location.hash = "${hash}"`,
		returnByValue: true,
	});
	await sleep(2000);
}

async function shot(name) {
	const { data } = await cdp.send("Page.captureScreenshot", {
		format: "png",
		captureBeyondViewport: false,
	});
	const path1 = path.join(OUT_CONV, `${name}.png`);
	const path2 = path.join(OUT_DOCS, `${name}.png`);
	const buf = Buffer.from(data, "base64");
	await writeFile(path1, buf);
	await writeFile(path2, buf);
	console.log(`[CAPTURED] ${name}.png (${(data.length * 0.75 / 1024).toFixed(1)} KB) -> ${path1}`);
}

async function waitForAppReady(maxRetries = 40) {
	for (let i = 0; i < maxRetries; i++) {
		const res = await cdp.send("Runtime.evaluate", {
			expression: `(() => {
				const boot = document.querySelector('.boot-state');
				const grid = document.querySelector('[data-testid="schedule-grid-view"]');
				const appt = document.querySelector('[data-testid^="appointment-card-"]');
				return Boolean(!boot && (grid || appt));
			})()`,
			returnByValue: true,
		});
		if (res?.value) {
			console.log(`[READY] Schedule grid ready after ${(i + 1) * 500}ms`);
			return true;
		}
		await sleep(500);
	}
	console.warn("[WARN] App ready timeout, proceeding anyway...");
}

try {
	console.log("Navigating to Schedule view...");
	await nav("#schedule");
	await sleep(2000);

	// Force reload to let addScriptToEvaluateOnNewDocument take effect
	console.log("Reloading with authenticated mock session...");
	await cdp.send("Page.reload", {});
	await waitForAppReady();
	await sleep(2000);

	// Ensure view mode is 'grid'
	await cdp.send("Runtime.evaluate", {
		expression: `(() => {
			window.location.hash = '#schedule';
			const gridBtn = document.querySelector('[data-testid="schedule-view-mode-grid"]');
			if (gridBtn && !document.querySelector('[data-testid="schedule-grid-view"]')) gridBtn.click();
		})()`,
		returnByValue: true,
	});
	await sleep(1500);

	// 1. PC Light (1440x900)
	console.log("Capturing 01_schedule_pc_light...");
	await setViewport(1440, 900, false);
	await setTheme("light");
	await shot("01_schedule_pc_light");

	// 2. PC Dark (1440x900)
	console.log("Capturing 02_schedule_pc_dark...");
	await setTheme("dark");
	await shot("02_schedule_pc_dark");

	// 3. Mobile Light (390x844)
	console.log("Capturing 03_schedule_mobile_light...");
	await setViewport(390, 844, true);
	await setTheme("light");
	await shot("03_schedule_mobile_light");

	// 4. Mobile Dark (390x844)
	console.log("Capturing 04_schedule_mobile_dark...");
	await setTheme("dark");
	await shot("04_schedule_mobile_dark");

	console.log("All 4 schedule states captured successfully!");
} finally {
	socket.close();
	browser.kill();
}
