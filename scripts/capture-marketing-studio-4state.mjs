import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_BASE = "http://127.0.0.1:5173";
const MARKETING_DIR = path.resolve(__dirname, "../docs/proofs/marketing");
const CRM_DIR = path.resolve(__dirname, "../docs/proofs/crm");

fs.mkdirSync(MARKETING_DIR, { recursive: true });
fs.mkdirSync(CRM_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
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
	} catch (_) {}
}

async function verifyAndLogScreenshot(filePath, description) {
	const stat = fs.statSync(filePath);
	if (stat.size < 20480) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filePath} is only ${stat.size} bytes (<20KB)!`);
	}
	console.log(`[PROOF CAPTURED] ${path.basename(filePath)} (${stat.size} bytes) -> ${description}`);
	// Mirror into crm dir
	const crmCopy = path.join(CRM_DIR, path.basename(filePath));
	fs.copyFileSync(filePath, crmCopy);
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

async function openMarketingStudio(page, theme) {
	await page.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "domcontentloaded", timeout: 45000 });
	await sleep(1500);

	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";

		// Trigger modal open
		window.location.hash = "marketing";
		window.dispatchEvent(new CustomEvent("dente:open-marketing"));
	}, theme);

	await suppressOverlays(page);
	await sleep(1000);

	const modal = page.locator('[data-testid="marketing-studio-modal"]').first();
	await modal.waitFor({ state: "visible", timeout: 15000 }).catch(async () => {
		console.warn("Retrying open event...");
		await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-marketing")));
		await modal.waitFor({ state: "visible", timeout: 15000 });
	});
	await sleep(800);
}

async function run() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light
		console.log("\n>>> Capturing Marketing Studio PC Light (1440x900) <<<");
		const pcLightCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupContextStorage(pcLightCtx, "light");
		const pcLightPage = await pcLightCtx.newPage();
		await openMarketingStudio(pcLightPage, "light");

		const pcLightPath = path.join(MARKETING_DIR, "01_marketing_studio_pc_light_1440x900.png");
		await pcLightPage.screenshot({ path: pcLightPath, fullPage: false });
		await verifyAndLogScreenshot(pcLightPath, "Marketing Studio Modal PC Light (1440x900)");

		// Switch to Express Launch Tab
		await pcLightPage.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-launch"]');
			if (btn) btn.click();
		});
		await sleep(800);
		const pcLightLaunchPath = path.join(MARKETING_DIR, "01_marketing_studio_launch_tab_pc_light_1440x900.png");
		await pcLightPage.screenshot({ path: pcLightLaunchPath, fullPage: false });
		await verifyAndLogScreenshot(pcLightLaunchPath, "Marketing Express Launch Tab PC Light");
		await pcLightCtx.close();

		// 2. PC Dark
		console.log("\n>>> Capturing Marketing Studio PC Dark (1440x900) <<<");
		const pcDarkCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupContextStorage(pcDarkCtx, "dark");
		const pcDarkPage = await pcDarkCtx.newPage();
		await openMarketingStudio(pcDarkPage, "dark");

		const pcDarkPath = path.join(MARKETING_DIR, "02_marketing_studio_pc_dark_1440x900.png");
		await pcDarkPage.screenshot({ path: pcDarkPath, fullPage: false });
		await verifyAndLogScreenshot(pcDarkPath, "Marketing Studio Modal PC Dark (1440x900)");

		// Switch to Promos Grid Tab
		await pcDarkPage.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-promos"]');
			if (btn) btn.click();
		});
		await sleep(800);
		const pcDarkPromosPath = path.join(MARKETING_DIR, "02_marketing_studio_promos_tab_pc_dark_1440x900.png");
		await pcDarkPage.screenshot({ path: pcDarkPromosPath, fullPage: false });
		await verifyAndLogScreenshot(pcDarkPromosPath, "Marketing Promos Grid Tab PC Dark");
		await pcDarkCtx.close();

		// 3. Mobile Light (390x844)
		console.log("\n>>> Capturing Marketing Studio Mobile Light (390x844) <<<");
		const mobileLightCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			...devices["iPhone 13"],
		});
		await setupContextStorage(mobileLightCtx, "light");
		const mobileLightPage = await mobileLightCtx.newPage();
		await openMarketingStudio(mobileLightPage, "light");

		const mobileLightPath = path.join(MARKETING_DIR, "03_marketing_studio_mobile_light_390x844.png");
		await mobileLightPage.screenshot({ path: mobileLightPath, fullPage: false });
		await verifyAndLogScreenshot(mobileLightPath, "Marketing Studio Bottom Sheet Mobile Light (390x844)");
		await mobileLightCtx.close();

		// 4. Mobile Dark (390x844)
		console.log("\n>>> Capturing Marketing Studio Mobile Dark (390x844) <<<");
		const mobileDarkCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			...devices["iPhone 13"],
		});
		await setupContextStorage(mobileDarkCtx, "dark");
		const mobileDarkPage = await mobileDarkCtx.newPage();
		await openMarketingStudio(mobileDarkPage, "dark");

		const mobileDarkPath = path.join(MARKETING_DIR, "04_marketing_studio_mobile_dark_390x844.png");
		await mobileDarkPage.screenshot({ path: mobileDarkPath, fullPage: false });
		await verifyAndLogScreenshot(mobileDarkPath, "Marketing Studio Bottom Sheet Mobile Dark (390x844)");
		await mobileDarkCtx.close();

		// Mirror leads proofs to crm
		const leadsDir = path.resolve(__dirname, "../docs/proofs/leads");
		if (fs.existsSync(leadsDir)) {
			for (const file of fs.readdirSync(leadsDir)) {
				if (file.endsWith(".png")) {
					fs.copyFileSync(path.join(leadsDir, file), path.join(CRM_DIR, file));
				}
			}
		}

		console.log("\n[SUCCESS] ALL MARKETING STUDIO 4-STATE PROOFS CAPTURED & VERIFIED!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("[FATAL ERROR]", e);
	process.exit(1);
});
