import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(PROOFS_DIR, { recursive: true });

async function initContextStorage(context, theme) {
	await context.addInitScript(({ themeMode }) => {
		const dummyUser = {
			id: "demo-doctor-chief",
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
		};
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(dummyUser));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(dummyUser));
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
		localStorage.setItem("dente_theme_mode", themeMode);
		localStorage.setItem("dente_theme", themeMode);
	}, { themeMode: theme });
}

async function prepareAndClean(page, theme) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if (await offlineBtn.count() > 0 && await offlineBtn.isVisible()) {
			console.log("Clicking 'Перейти в автономный режим' button...");
			await offlineBtn.click({ force: true });
			await page.waitForTimeout(1000);
		}

		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка системы") || text.includes("Загрузка CRM") || text.includes("Загрузка журнала");
		}).catch(() => true);
		if (!hasLoading) break;
		await page.waitForTimeout(500);
	}

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
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container'
		).forEach((el) => el.remove());
	}, theme);

	await page.waitForTimeout(600);
}

async function run() {
	console.log("Launching Edge/Chromium for mobile sterilization screenshot...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	}

	try {
		const contextMob = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await initContextStorage(contextMob, "light");

		const pageMob = await contextMob.newPage();
		const targetUrl = `${WEB_URL}/?demo=true#scanner`;
		console.log(`Navigating to ${targetUrl} (Mobile Light)...`);
		await pageMob.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await pageMob.waitForTimeout(2000);
		await prepareAndClean(pageMob, "light");

		console.log("Waiting for .sanpin-container...");
		await pageMob.waitForSelector(".sanpin-container", { state: "visible", timeout: 25000 });

		const autoclaveTab = pageMob.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTab.count() > 0) {
			await autoclaveTab.click({ force: true });
			await pageMob.waitForTimeout(800);
		}

		console.log("Waiting for cycles container or cards...");
		await pageMob.waitForSelector('.sanpin-mobile-cards-wrap, .sanpin-cycles-container', { state: "visible", timeout: 15000 });
		await pageMob.waitForTimeout(1000);

		// Clean up any remaining toasts/tour overlays
		await pageMob.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container'
			).forEach((el) => el.remove());
		});

		const filePath = path.join(PROOFS_DIR, "04_mobile_sterilization_light_390x844.png");
		await pageMob.screenshot({ path: filePath, fullPage: false });
		const fileStat = await stat(filePath);
		console.log(`[Screenshot] Saved: ${filePath} (${(fileStat.size / 1024).toFixed(1)} KB) -> OK: ${fileStat.size >= 20000}`);

		await contextMob.close();
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Mobile capture failed:", err);
	process.exit(1);
});
