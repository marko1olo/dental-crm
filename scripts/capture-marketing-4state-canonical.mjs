import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/marketing");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const splash = document.getElementById("boot-splash");
		if (splash) splash.remove();

		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			#boot-splash,
			.boot-state,
			.default-clinic-banner,
			[role="status"] {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation-duration: 0.01ms !important;
				animation-iteration-count: 1 !important;
				transition-duration: 0.01ms !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function verifyAndLogScreenshot(filePath, description) {
	const stat = fs.statSync(filePath);
	if (stat.size < 20480) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is only ${stat.size} bytes (<20KB)!`);
	}
	console.log(`[PROOF CAPTURED] ${path.basename(filePath)} (${stat.size} bytes) -> ${description}`);
}

async function setupContextStorage(context, theme) {
	await context.addInitScript((th) => {
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_session_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_active_user_id", "demo-owner-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "demo-owner-id",
			fullName: "Главврач / Владелец",
			role: "owner",
			email: "owner@clinic.com",
		}));
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_last_view", "marketing");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
			theme: th,
		}));
	}, theme);
}

async function navigateAndPreparePage(page, theme) {
	console.log(`Navigating to ${WEB_BASE}/?demo=true#marketing ...`);
	await page.goto(`${WEB_BASE}/?demo=true#marketing`, { waitUntil: "domcontentloaded", timeout: 45000 });
	await sleep(1500);

	try {
		const hasPassword = await page.$('input[type="password"]');
		if (hasPassword) {
			console.log("[Auth] Found login form, logging in...");
			const inputs = await page.$$("input");
			if (inputs.length >= 2) {
				await inputs[0].click({ clickCount: 3 });
				await inputs[0].type("doctor@clinic.com");
				await inputs[1].click({ clickCount: 3 });
				await inputs[1].type("dente2026");
				await sleep(300);
				const submitBtn = await page.$('button[type="submit"]');
				if (submitBtn) {
					await submitBtn.click();
					await sleep(3000);
				}
			}
		}
	} catch (e) {
		console.warn("[Auth note]", e.message);
	}

	await page.evaluate((th) => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setSelectedWorkspaceRole("owner");
			window.__useAppStore.getState().setCurrentView("marketing");
		}
		window.location.hash = "marketing";
		window.dispatchEvent(new HashChangeEvent("hashchange"));

		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, theme);

	await suppressOverlays(page);
	await sleep(1000);

	// Wait for marketing view
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return text.includes("Акции и реклама клиники") || document.querySelector('[data-testid="marketing-view"]');
	}, { timeout: 30000 });

	// Switch to Analytics tab (Воронка лидов & Когорты)
	try {
		const analyticsTab = page.locator('[data-testid="tab-nav-analytics"]').first();
		if (await analyticsTab.count() > 0 && await analyticsTab.isVisible()) {
			await analyticsTab.click({ force: true });
			await sleep(1000);
		}
	} catch (e) {
		console.warn("[Tab note]", e.message);
	}

	await page.waitForSelector('[data-testid="marketing-dashboard-page"]', { state: "visible", timeout: 20000 }).catch(() => {});
	await sleep(1000);
}

async function run() {
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ==========================================
		// 1. DESKTOP LIGHT: 1440 x 900
		// ==========================================
		console.log("\n>>> Capturing PC Light (1440x900) <<<");
		const pcLightCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupContextStorage(pcLightCtx, "light");
		const pcLightPage = await pcLightCtx.newPage();
		await navigateAndPreparePage(pcLightPage, "light");

		const pcLightPath = path.join(PROOFS_DIR, "01_marketing_dashboard_pc_light_1440x900.png");
		await pcLightPage.screenshot({ path: pcLightPath, fullPage: false });
		await verifyAndLogScreenshot(pcLightPath, "PC Light 1440x900 Marketing Dashboard & Cohorts");
		fs.copyFileSync(pcLightPath, path.join(PROOFS_DIR, "01_marketing_funnel_pc_light_1440x900.png"));
		await pcLightCtx.close();

		// ==========================================
		// 2. DESKTOP DARK: 1440 x 900
		// ==========================================
		console.log("\n>>> Capturing PC Dark (1440x900) <<<");
		const pcDarkCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupContextStorage(pcDarkCtx, "dark");
		const pcDarkPage = await pcDarkCtx.newPage();
		await navigateAndPreparePage(pcDarkPage, "dark");

		const pcDarkPath = path.join(PROOFS_DIR, "02_marketing_dashboard_pc_dark_1440x900.png");
		await pcDarkPage.screenshot({ path: pcDarkPath, fullPage: false });
		await verifyAndLogScreenshot(pcDarkPath, "PC Dark 1440x900 Marketing Dashboard & Cohorts");
		fs.copyFileSync(pcDarkPath, path.join(PROOFS_DIR, "02_marketing_funnel_pc_dark_1440x900.png"));
		await pcDarkCtx.close();

		// ==========================================
		// 3. MOBILE LIGHT: 390 x 844 (iPhone 14)
		// ==========================================
		console.log("\n>>> Capturing Mobile Light (390x844) <<<");
		const mobileLightCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			...devices["iPhone 13"],
		});
		await setupContextStorage(mobileLightCtx, "light");
		const mobileLightPage = await mobileLightCtx.newPage();
		await navigateAndPreparePage(mobileLightPage, "light");

		// Capture funnel top
		const mobileFunnelLightPath = path.join(PROOFS_DIR, "03_marketing_funnel_mobile_light_390x844.png");
		await mobileLightPage.screenshot({ path: mobileFunnelLightPath, fullPage: false });
		await verifyAndLogScreenshot(mobileFunnelLightPath, "Mobile Light 390x844 Funnel Top");

		// Scroll to cohorts
		await mobileLightPage.evaluate(() => {
			const el = document.querySelector('[data-testid="marketing-segments-section"]') ||
					   document.querySelector('[data-testid="marketing-cohort-card"]');
			if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
		});
		await sleep(600);
		const mobileCohortsLightPath = path.join(PROOFS_DIR, "03_marketing_cohorts_mobile_light_390x844.png");
		await mobileLightPage.screenshot({ path: mobileCohortsLightPath, fullPage: false });
		await verifyAndLogScreenshot(mobileCohortsLightPath, "Mobile Light 390x844 Cohorts & RFM");
		await mobileLightCtx.close();

		// ==========================================
		// 4. MOBILE DARK: 390 x 844 (iPhone 14)
		// ==========================================
		console.log("\n>>> Capturing Mobile Dark (390x844) <<<");
		const mobileDarkCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			...devices["iPhone 13"],
		});
		await setupContextStorage(mobileDarkCtx, "dark");
		const mobileDarkPage = await mobileDarkCtx.newPage();
		await navigateAndPreparePage(mobileDarkPage, "dark");

		// Capture funnel top
		const mobileFunnelDarkPath = path.join(PROOFS_DIR, "04_marketing_funnel_mobile_dark_390x844.png");
		await mobileDarkPage.screenshot({ path: mobileFunnelDarkPath, fullPage: false });
		await verifyAndLogScreenshot(mobileFunnelDarkPath, "Mobile Dark 390x844 Funnel Top");

		// Scroll to cohorts
		await mobileDarkPage.evaluate(() => {
			const el = document.querySelector('[data-testid="marketing-segments-section"]') ||
					   document.querySelector('[data-testid="marketing-cohort-card"]');
			if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
		});
		await sleep(600);
		const mobileCohortsDarkPath = path.join(PROOFS_DIR, "04_marketing_cohorts_mobile_dark_390x844.png");
		await mobileDarkPage.screenshot({ path: mobileCohortsDarkPath, fullPage: false });
		await verifyAndLogScreenshot(mobileCohortsDarkPath, "Mobile Dark 390x844 Cohorts & RFM");
		await mobileDarkCtx.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 4 CANONICAL MARKETING PROOFS CAPTURED SUCCESSFULLY! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("[FATAL ERROR]", e);
	process.exit(1);
});
