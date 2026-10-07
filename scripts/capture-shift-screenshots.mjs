import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/bead13fa-4414-41ad-91e8-653ea28526bb";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/shift";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function getLiveProvisionedTokens() {
	console.log("[Auth] Provisioning live clinic session via Fastify API /api/auth/setup/init...");
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-shift-${Date.now()}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	if (!initRes.ok) {
		throw new Error(`Clinic setup init failed HTTP ${initRes.status}: ${await initRes.text()}`);
	}
	const initData = await initRes.json();
	console.log(`[Auth] Clinic init OK, clinicToken obtained. Owner user: ${initData.ownerUserId}`);

	console.log("[Auth] Unlocking doctor staff token via /api/auth/staff/unlock...");
	const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	if (!unlockRes.ok) {
		throw new Error(`Doctor unlock failed HTTP ${unlockRes.status}: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();
	console.log("[Auth] Doctor unlocked OK, staffToken obtained!");

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		user: unlockData.user || {
			id: initData.ownerUserId,
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
		},
	};
}

function injectStorage(page, { ct, st, usr, theme }) {
	return page.addInitScript(
		({ clinicToken, staffToken, user, initialTheme }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dente_theme_mode", initialTheme);
			localStorage.setItem("dente_theme", initialTheme);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_doctor_shift_active", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			localStorage.setItem(
				"dente_quest_progress_v2",
				JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{ clinicToken: ct, staffToken: st, user: usr, initialTheme: theme },
	);
}

async function run() {
	const auth = await getLiveProvisionedTokens();

	console.log("Launching Edge browser via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		// ==========================================
		// 1. PC Light (1440x900)
		// ==========================================
		console.log("Capturing 1. PC Light (1440x900) of #shift...");
		const contextLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pageLight = await contextLight.newPage();

		await injectStorage(pageLight, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "light",
		});

		await pageLight.goto(`${WEB_URL}/`, {
			waitUntil: "commit",
			timeout: 45000,
		});
		await pageLight.waitForTimeout(2000);

		// Apply light theme and set hash
		await pageLight.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			window.location.hash = "shift";
		});

		// Wait for splash / loader to detach
		await pageLight.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageLight.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		// Remove any obstructive overlays
		await pageLight.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Light)...");
		await pageLight.waitForSelector(
			"[data-testid='shift-view-desktop'], [data-testid='doctor-shift-hero-card'], .shift-view-scroll-container",
			{
				state: "visible",
				timeout: 20000,
			},
		);
		await pageLight.waitForTimeout(2000);

		// Clean up any remaining interactive tour popover
		await pageLight.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});
		await pageLight.waitForTimeout(500);

		const lightFile = "proof_shift_view_pc_light.png";
		const lightConvPath = path.join(OUT_CONV, lightFile);
		const lightDocsPath = path.join(OUT_DOCS, lightFile);
		await pageLight.screenshot({ path: lightConvPath, fullPage: false });
		await pageLight.screenshot({ path: lightDocsPath, fullPage: false });
		console.log(`Saved ${lightConvPath}`);
		await contextLight.close();

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("Capturing 2. PC Dark (1440x900) of #shift...");
		const contextDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pageDark = await contextDark.newPage();

		await injectStorage(pageDark, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "dark",
		});

		await pageDark.goto(`${WEB_URL}/`, {
			waitUntil: "commit",
			timeout: 45000,
		});
		await pageDark.waitForTimeout(2000);

		// Apply dark theme and set hash
		await pageDark.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			window.location.hash = "shift";
		});

		// Wait for splash / loader to detach
		await pageDark.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageDark.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		// Remove any obstructive overlays
		await pageDark.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Dark)...");
		await pageDark.waitForSelector(
			"[data-testid='shift-view-desktop'], [data-testid='doctor-shift-hero-card'], .shift-view-scroll-container",
			{
				state: "visible",
				timeout: 20000,
			},
		);
		await pageDark.waitForTimeout(2000);

		// Clean up any remaining interactive tour popover
		await pageDark.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});
		await pageDark.waitForTimeout(500);

		const darkFile = "proof_shift_view_pc_dark.png";
		const darkConvPath = path.join(OUT_CONV, darkFile);
		const darkDocsPath = path.join(OUT_DOCS, darkFile);
		await pageDark.screenshot({ path: darkConvPath, fullPage: false });
		await pageDark.screenshot({ path: darkDocsPath, fullPage: false });
		console.log(`Saved ${darkConvPath}`);
		await contextDark.close();

		console.log("=== SCREENSHOT CAPTURE COMPLETED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture error:", err);
	process.exit(1);
});
