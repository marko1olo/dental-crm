import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/840d025c-f804-42b4-bd0f-bdb907a708dc";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/shift";
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
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
			);
		},
		{ clinicToken: ct, staffToken: st, user: usr, initialTheme: theme },
	);
}

async function run() {
	const auth = await getLiveProvisionedTokens();

	console.log("Launching Chromium browser via Playwright...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC Light (1440x900)
		// ==========================================
		console.log("\n--- 1. PC Light (1440x900) ---");
		const contextLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pageLight = await contextLight.newPage();
		await injectStorage(pageLight, { ct: auth.clinicToken, st: auth.staffToken, usr: auth.user, theme: "light" });

		await pageLight.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await pageLight.waitForTimeout(2000);

		await pageLight.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			window.location.hash = "shift";
		});

		await pageLight.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageLight.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		await pageLight.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Light)...");
		await pageLight.waitForSelector(
			"[data-testid='shift-view-desktop'], [data-testid='doctor-shift-hero-card'], .shift-view-scroll-container",
			{ state: "visible", timeout: 20000 },
		);
		await pageLight.waitForTimeout(1500);

		await pageLight.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		const lightFile = "shift_cockpit_1440x900_light.png";
		await pageLight.screenshot({ path: path.join(OUT_CONV, lightFile), fullPage: false });
		await pageLight.screenshot({ path: path.join(OUT_DOCS, lightFile), fullPage: false });
		console.log(`Saved ${lightFile} (PC Light)`);
		await contextLight.close();

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("\n--- 2. PC Dark (1440x900) ---");
		const contextDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pageDark = await contextDark.newPage();
		await injectStorage(pageDark, { ct: auth.clinicToken, st: auth.staffToken, usr: auth.user, theme: "dark" });

		await pageDark.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await pageDark.waitForTimeout(2000);

		await pageDark.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			window.location.hash = "shift";
		});

		await pageDark.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageDark.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		await pageDark.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Dark)...");
		await pageDark.waitForSelector(
			"[data-testid='shift-view-desktop'], [data-testid='doctor-shift-hero-card'], .shift-view-scroll-container",
			{ state: "visible", timeout: 20000 },
		);
		await pageDark.waitForTimeout(1500);

		await pageDark.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		const darkFile = "shift_cockpit_1440x900_dark.png";
		await pageDark.screenshot({ path: path.join(OUT_CONV, darkFile), fullPage: false });
		await pageDark.screenshot({ path: path.join(OUT_DOCS, darkFile), fullPage: false });
		console.log(`Saved ${darkFile} (PC Dark)`);
		await contextDark.close();

		// ==========================================
		// 3. Mobile Light (390x844)
		// ==========================================
		console.log("\n--- 3. Mobile Light (390x844) ---");
		const contextMobileLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		const pageMobileLight = await contextMobileLight.newPage();
		await injectStorage(pageMobileLight, { ct: auth.clinicToken, st: auth.staffToken, usr: auth.user, theme: "light" });

		await pageMobileLight.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await pageMobileLight.waitForTimeout(2000);

		await pageMobileLight.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			window.location.hash = "shift";
		});

		await pageMobileLight.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageMobileLight.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		await pageMobileLight.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Mobile Light)...");
		await pageMobileLight.waitForSelector(
			"[data-testid='shift-view-mobile'], [data-testid='mobile-shift-revenue-block'], .mobile-shift-hero-card",
			{ state: "visible", timeout: 20000 },
		);
		await pageMobileLight.waitForTimeout(1500);

		const mobileLightFile = "shift_cockpit_390x844_light.png";
		await pageMobileLight.screenshot({ path: path.join(OUT_CONV, mobileLightFile), fullPage: false });
		await pageMobileLight.screenshot({ path: path.join(OUT_DOCS, mobileLightFile), fullPage: false });
		console.log(`Saved ${mobileLightFile} (Mobile Light)`);
		await contextMobileLight.close();

		// ==========================================
		// 4. Mobile Dark (390x844)
		// ==========================================
		console.log("\n--- 4. Mobile Dark (390x844) ---");
		const contextMobileDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		const pageMobileDark = await contextMobileDark.newPage();
		await injectStorage(pageMobileDark, { ct: auth.clinicToken, st: auth.staffToken, usr: auth.user, theme: "dark" });

		await pageMobileDark.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await pageMobileDark.waitForTimeout(2000);

		await pageMobileDark.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			window.location.hash = "shift";
		});

		await pageMobileDark.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
		await pageMobileDark.waitForSelector("text=Загрузка рабочей смены", { state: "detached", timeout: 15000 }).catch(() => {});

		await pageMobileDark.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		console.log("Waiting for shift view components to render (Mobile Dark)...");
		await pageMobileDark.waitForSelector(
			"[data-testid='shift-view-mobile'], [data-testid='mobile-shift-revenue-block'], .mobile-shift-hero-card",
			{ state: "visible", timeout: 20000 },
		);
		await pageMobileDark.waitForTimeout(1500);

		const mobileDarkFile = "shift_cockpit_390x844_dark.png";
		await pageMobileDark.screenshot({ path: path.join(OUT_CONV, mobileDarkFile), fullPage: false });
		await pageMobileDark.screenshot({ path: path.join(OUT_DOCS, mobileDarkFile), fullPage: false });
		console.log(`Saved ${mobileDarkFile} (Mobile Dark)`);
		await contextMobileDark.close();

		console.log("\n=== ALL 4 SCREENSHOTS CAPTURED PERFECTLY! ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture error:", err);
	process.exit(1);
});
