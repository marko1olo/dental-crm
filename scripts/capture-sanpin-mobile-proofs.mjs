import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(PROOFS_DIR, { recursive: true });

async function getLiveProvisionedTokens() {
	const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `doctor-mobile-${Date.now()}@dente.local`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	const unlockData = await unlockRes.json();

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

async function preparePage(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
		).forEach((el) => el.remove());
		const b = Array.from(document.querySelectorAll("button, div")).find((el) =>
			el.textContent && el.textContent.includes("Сначала осмотреться")
		);
		if (b) b.click();
	}, theme);
}

async function setupAndNavigate(page, { ct, st, usr, theme }) {
	await injectStorage(page, { ct, st, usr, theme });
	await page.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 30000 });
	await page.waitForTimeout(1000);
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		window.location.hash = "scanner";
	}, theme);
	await page.waitForTimeout(1500);
	await page.waitForSelector("text=Загрузка CRM", { state: "detached", timeout: 20000 }).catch(() => {});
	await page.waitForSelector(".sanpin-container, [data-testid='tab-autoclave-btn']", { state: "visible", timeout: 20000 }).catch(() => {});
	await preparePage(page, theme);
	await page.waitForTimeout(1000);
}

async function captureScreen(page, filename) {
	const filePath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false });
	const fileStat = await stat(filePath);
	console.log(`[Screenshot] Saved: ${filePath} (${(fileStat.size / 1024).toFixed(1)} KB)`);
}

async function run() {
	const auth = await getLiveProvisionedTokens();

	console.log("Launching Edge browser via Playwright...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	}

	try {
		// ==========================================
		// 1. Mobile Light (390x844 - iPhone 14)
		// ==========================================
		console.log("Capturing Mobile Light (390x844)...");
		const contextMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const pageMobLight = await contextMobLight.newPage();
		await setupAndNavigate(pageMobLight, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "light",
		});

		await captureScreen(pageMobLight, "mobile_light_sanpin_sterilization_390x844.png");
		await contextMobLight.close();

		// ==========================================
		// 2. Mobile Dark (390x844 - iPhone 14)
		// ==========================================
		console.log("Capturing Mobile Dark (390x844)...");
		const contextMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		const pageMobDark = await contextMobDark.newPage();
		await setupAndNavigate(pageMobDark, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			usr: auth.user,
			theme: "dark",
		});

		await captureScreen(pageMobDark, "mobile_dark_sanpin_sterilization_390x844.png");
		await contextMobDark.close();

		console.log("Mobile SanPiN screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
