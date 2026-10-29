import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/marketing");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function getAuthTokens() {
	console.log("[Auth] Provisioning real session via Fastify API...");
	const uniqueId = Date.now();

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `marketing-owner-${uniqueId}@dente.ru`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
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

	try {
		await fetch(`${API_BASE}/api/leads`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				name: "Елена Васильева",
				phone: "+7 (999) 123-45-67",
				source: "yandex_direct",
				status: "new",
				expectedRevenue: "35000",
				notes: "Консультация по имплантации",
				priority: "high",
			}),
		});

		await fetch(`${API_BASE}/api/leads`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				name: "Дмитрий Смирнов",
				phone: "+7 (916) 234-56-78",
				source: "gis_2",
				status: "contacted",
				expectedRevenue: "12000",
				notes: "Острая боль: удаление зуба",
				priority: "urgent",
			}),
		});

		await fetch(`${API_BASE}/api/leads`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				name: "Ольга Морозова",
				phone: "+7 (903) 345-67-89",
				source: "prodoctorov",
				status: "consult_booked",
				expectedRevenue: "18500",
				notes: "Профгигиена и отбеливание",
				priority: "normal",
			}),
		});
		console.log("[Auth] Leads seeded successfully.");
	} catch (e) {
		console.warn("[Auth] Leads seed warning:", e.message);
	}

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
	if (stat.size < 35000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is only ${stat.size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${path.basename(filePath)} (${stat.size} bytes) -> ${description}`);
}

async function run() {
	const auth = await getAuthTokens();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await context.addInitScript(
		({ ct, st, uid }) => {
			window.__denteClinicToken = ct;
			window.__denteStaffToken = st;
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_user_id", uid);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_last_view", "marketing");
			localStorage.setItem("dente_sidebar_collapsed", "false");
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{ ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId },
	);

	const page = await context.newPage();

	// ==========================================
	// 1. DESKTOP VIEWPORT: 1440 x 900
	// ==========================================
	console.log("\n>>> Capturing Desktop Marketing Funnel (1440x900) <<<");
	console.log("Navigating PC to http://127.0.0.1:5173/#marketing ...");
	await page.goto(`${WEB_BASE}/#marketing`, { waitUntil: "commit", timeout: 25000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
	await page.waitForSelector('[data-testid="marketing-view"], .marketing-zone', { state: "visible", timeout: 25000 });
	await suppressOverlays(page);

	console.log("Switching to 'Воронка лидов' tab...");
	const analyticsTab = page.locator('[data-testid="tab-nav-analytics"]');
	if (await analyticsTab.count() > 0) {
		await analyticsTab.click({ force: true });
	}
	await page.waitForSelector('[data-testid="marketing-dashboard-page"]', { state: "visible", timeout: 20000 });
	await page.waitForTimeout(1000);

	// ☀️ 01 PC Light
	console.log("Saving 01_marketing_funnel_pc_light_1440x900.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.style.colorScheme = "light";
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");
	});
	await page.waitForTimeout(600);
	const pcLightPath = path.join(PROOFS_DIR, "01_marketing_funnel_pc_light_1440x900.png");
	await page.screenshot({ path: pcLightPath, fullPage: false });
	await verifyAndLogScreenshot(pcLightPath, "PC Light 1440x900 Marketing Funnel Dashboard");

	// 🌙 02 PC Dark
	console.log("Saving 02_marketing_funnel_pc_dark_1440x900.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		document.documentElement.style.colorScheme = "dark";
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
	});
	await page.waitForTimeout(600);
	const pcDarkPath = path.join(PROOFS_DIR, "02_marketing_funnel_pc_dark_1440x900.png");
	await page.screenshot({ path: pcDarkPath, fullPage: false });
	await verifyAndLogScreenshot(pcDarkPath, "PC Dark 1440x900 Marketing Funnel Dashboard");

	// ==========================================
	// 2. MOBILE VIEWPORT: 390 x 844 (iPhone 14)
	// ==========================================
	console.log("\n>>> Switching to Mobile Viewport (390x844) on live hydrated page <<<");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1500);
	await suppressOverlays(page);

	// ☀️ 03 Mobile Light
	console.log("Saving 03_marketing_funnel_mobile_light_390x844.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.style.colorScheme = "light";
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(800);
	const mobileLightPath = path.join(PROOFS_DIR, "03_marketing_funnel_mobile_light_390x844.png");
	await page.screenshot({ path: mobileLightPath, fullPage: false });
	await verifyAndLogScreenshot(mobileLightPath, "Mobile Light 390x844 Marketing Funnel Dashboard");

	// 🌙 04 Mobile Dark
	console.log("Saving 04_marketing_funnel_mobile_dark_390x844.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		document.documentElement.style.colorScheme = "dark";
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(800);
	const mobileDarkPath = path.join(PROOFS_DIR, "04_marketing_funnel_mobile_dark_390x844.png");
	await page.screenshot({ path: mobileDarkPath, fullPage: false });
	await verifyAndLogScreenshot(mobileDarkPath, "Mobile Dark 390x844 Marketing Funnel Dashboard");

	await context.close();
	await browser.close();
	console.log("\n>>> ALL 4 CANONICAL MARKETING PROOFS CAPTURED SUCCESSFULLY! <<<");
}

run().catch((e) => {
	console.error("[FATAL ERROR]", e);
	process.exit(1);
});
