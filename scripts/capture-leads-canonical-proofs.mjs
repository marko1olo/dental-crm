import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/leads");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function provisionSessionAndSeedLeads() {
	const uniqueId = Date.now();
	console.log(`[Provisioning] Initializing test session leads-${uniqueId}@dente-clinic.ru...`);

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ (Лиды)",
			email: `leads-proof-${uniqueId}@dente-clinic.ru`,
			password: "Password123!",
			ownerName: "Д-р Смирнов Андрей Васильевич",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	console.log("[Provisioning] Seeding real leads in Fastify + PostgreSQL 18...");
	// 1. New lead
	await fetch(`${API_BASE}/api/leads`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Елена Васильева",
			phone: "+7 (999) 123-45-67",
			source: "yandex_direct",
			status: "new",
			expectedRevenue: "35000",
			notes: "Первичная консультация по установке брекетов",
			priority: "high",
		}),
	});

	// 2. Contacted lead
	await fetch(`${API_BASE}/api/leads`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Дмитрий Смирнов",
			phone: "+7 (916) 234-56-78",
			source: "gis_2",
			status: "contacted",
			expectedRevenue: "12000",
			notes: "Острая боль: удаление зуба мудрости",
			priority: "urgent",
		}),
	});

	// 3. Consult booked lead
	await fetch(`${API_BASE}/api/leads`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Ольга Морозова",
			phone: "+7 (903) 345-67-89",
			source: "prodoctorov",
			status: "consult_booked",
			expectedRevenue: "18500",
			notes: "Профгигиена и отбеливание ZOOM 4",
			priority: "normal",
		}),
	});

	// 4. Archive / Trash lead
	await fetch(`${API_BASE}/api/leads`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Сергей Петров",
			phone: "+7 (926) 456-78-90",
			source: "site_seo",
			status: "trash",
			expectedRevenue: "0",
			notes: "Недозвон: абонент вне зоны доступа",
			dropReason: "Отказ / Недозвон",
		}),
	});

	console.log("[Provisioning] 4 canonical leads seeded successfully!");

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element,
			.default-clinic-banner,
			[role="status"] {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function verifyAndLogScreenshot(filePath, description) {
	const stat = fs.statSync(filePath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${path.basename(filePath)} (${stat.size} bytes) -> ${description}`);
}

async function run() {
	const auth = await provisionSessionAndSeedLeads();

	let browser;
	try {
		browser = await chromium.launch({
			headless: true,
			executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
		});
	} catch {
		console.log("System Chrome not found, using bundled Chromium");
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
		});
	}

	// ==========================================
	// 1. DESKTOP VIEWPORT: 1440 x 900
	// ==========================================
	console.log("Setting up desktop context (1440x900)...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await pcContext.addInitScript(
		({ ct, st, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_last_view", "leads");
			localStorage.setItem(
				"dente_staff_session",
				JSON.stringify({
					userId: uid,
					name: "Д-р Смирнов А. В.",
					fullName: "Д-р Смирнов Андрей Васильевич",
					role: "owner",
					roleScope: "clinical_director",
				}),
			);
		},
		{
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
		},
	);

	const pcPage = await pcContext.newPage();
	console.log("Navigating desktop to http://127.0.0.1:5173/#leads ...");
	await pcPage.goto(`${WEB_BASE}/#leads`, { waitUntil: "domcontentloaded", timeout: 30000 });

	console.log("Waiting for Kanban board to render on desktop...");
	await pcPage.waitForSelector(".leads-kanban-board, [data-testid=\"leads-kanban-board\"]", {
		timeout: 30000,
	});
	await pcPage.waitForTimeout(2000);
	await suppressOverlays(pcPage);

	// ☀️ PC Light 1440x900
	console.log("Capturing PC Light 1440x900...");
	await pcPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");
	});
	await pcPage.waitForTimeout(1000);

	const pcLightPath = path.join(PROOFS_DIR, "leads_kanban_pc_light_1440x900.png");
	await pcPage.screenshot({ path: pcLightPath });
	await verifyAndLogScreenshot(pcLightPath, "PC Light 1440x900 Leads Kanban");

	// 🌙 PC Dark 1440x900
	console.log("Capturing PC Dark 1440x900...");
	await pcPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
	});
	await pcPage.waitForTimeout(1000);

	const pcDarkPath = path.join(PROOFS_DIR, "leads_kanban_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: pcDarkPath });
	await verifyAndLogScreenshot(pcDarkPath, "PC Dark 1440x900 Leads Kanban");

	await pcContext.close();

	// ==========================================
	// 2. MOBILE VIEWPORT: 390 x 844 (iPhone 14)
	// ==========================================
	console.log("Setting up mobile context (390x844)...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});

	await mobileContext.addInitScript(
		({ ct, st, uid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_last_view", "leads");
			localStorage.setItem(
				"dente_staff_session",
				JSON.stringify({
					userId: uid,
					name: "Д-р Смирнов А. В.",
					fullName: "Д-р Смирнов Андрей Васильевич",
					role: "owner",
					roleScope: "clinical_director",
				}),
			);
		},
		{
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
		},
	);

	const mobilePage = await mobileContext.newPage();
	console.log("Navigating mobile to http://127.0.0.1:5173/#leads ...");
	await mobilePage.goto(`${WEB_BASE}/#leads`, { waitUntil: "domcontentloaded", timeout: 30000 });

	console.log("Waiting for Mobile Feed/Board to render...");
	await mobilePage.waitForSelector(".leads-mobile-container, .leads-board-container, [data-testid=\"leads-kanban-board\"]", {
		timeout: 30000,
	});
	await mobilePage.waitForTimeout(2000);
	await suppressOverlays(mobilePage);

	// ☀️ Mobile Light 390x844
	console.log("Capturing Mobile Light 390x844...");
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");
	});
	await mobilePage.waitForTimeout(1000);

	const mobileLightPath = path.join(PROOFS_DIR, "leads_kanban_mobile_light_390x844.png");
	await mobilePage.screenshot({ path: mobileLightPath });
	await verifyAndLogScreenshot(mobileLightPath, "Mobile Light 390x844 Leads Kanban");

	// 🌙 Mobile Dark 390x844
	console.log("Capturing Mobile Dark 390x844...");
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
	});
	await mobilePage.waitForTimeout(1000);

	const mobileDarkPath = path.join(PROOFS_DIR, "leads_kanban_mobile_dark_390x844.png");
	await mobilePage.screenshot({ path: mobileDarkPath });
	await verifyAndLogScreenshot(mobileDarkPath, "Mobile Dark 390x844 Leads Kanban");

	await mobileContext.close();
	await browser.close();
	console.log("SUCCESS: All 4 canonical Leads Kanban visual proofs captured!");
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
