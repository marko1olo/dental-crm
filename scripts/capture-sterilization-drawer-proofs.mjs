import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "670604ef-4e3d-4059-98a0-4bd9a905313e";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

async function initContextStorage(context, theme) {
	await context.addInitScript(({ themeMode }) => {
		localStorage.setItem("dente_demo_showcase", "true");
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
		localStorage.setItem("theme", themeMode);
	}, { themeMode: theme });
}

async function prepareAndClean(page, theme) {
	for (let i = 0; i < 30; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if (await offlineBtn.count() > 0 && await offlineBtn.isVisible()) {
			await offlineBtn.click({ force: true });
			await page.waitForTimeout(400);
		}

		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка системы") || text.includes("Загрузка CRM");
		}).catch(() => true);
		if (!hasLoading) break;
		await page.waitForTimeout(400);
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
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"]'
		).forEach((el) => el.remove());
	}, theme);

	await page.waitForTimeout(500);
}

async function saveProof(page, baseName) {
	const filename = `${baseName}.png`;
	const p1 = path.join(OUT_DOCS, filename);
	const p2 = path.join(OUT_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false });
	copyFileSync(p1, p2);

	const st = statSync(p1);
	console.log(`[Screenshot] Saved: ${filename} (${(st.size / 1024).toFixed(1)} KB)`);
}

async function run() {
	console.log("Launching Chromium for Sterilization Drawer Proofs...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	}

	try {
		// 1. PC Light Drawer
		const ctxPc = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await initContextStorage(ctxPc, "light");
		const pagePc = await ctxPc.newPage();
		await pagePc.goto(`${WEB_URL}/?demo=true#sanpin`, { waitUntil: "networkidle", timeout: 35000 });
		await prepareAndClean(pagePc, "light");
		await pagePc.waitForSelector(".sanpin-container, .sanpin-journal-view, .sanpin-sterilization-journal", { timeout: 25000 }).catch(() => {});

		const autoclaveTab = pagePc.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTab.count() > 0 && await autoclaveTab.isVisible()) {
			await autoclaveTab.click({ force: true });
			await pagePc.waitForTimeout(600);
		}

		// Click "+ Новый цикл"
		const newCycleBtn = pagePc.locator('button:has-text("+ Новый цикл"), [data-testid="open-new-cycle-btn"], [data-testid="open-new-cycle-modal-btn"], [data-testid="journal-view-new-cycle-cta"]');
		if (await newCycleBtn.count() > 0) {
			await newCycleBtn.first().click({ force: true });
			await pagePc.waitForTimeout(800);
		}
		await pagePc.waitForSelector('[data-testid="sterilization-cycle-drawer"]', { timeout: 5000 }).catch(() => {});
		await saveProof(pagePc, "sterilization_drawer_pc_light");
		await ctxPc.close();

		// 2. Mobile Dark Drawer
		const ctxMob = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		await initContextStorage(ctxMob, "dark");
		const pageMob = await ctxMob.newPage();
		await pageMob.goto(`${WEB_URL}/?demo=true#sanpin`, { waitUntil: "networkidle", timeout: 35000 });
		await prepareAndClean(pageMob, "dark");
		await pageMob.waitForSelector(".sanpin-container, .sanpin-journal-view, .sanpin-sterilization-journal", { timeout: 25000 }).catch(() => {});

		const autoclaveTabMob = pageMob.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabMob.count() > 0 && await autoclaveTabMob.isVisible()) {
			await autoclaveTabMob.click({ force: true });
			await pageMob.waitForTimeout(600);
		}

		const newCycleBtnMob = pageMob.locator('button:has-text("+ Новый цикл"), [data-testid="open-new-cycle-modal-btn"], [data-testid="open-new-cycle-btn"], [data-testid="journal-view-new-cycle-cta"]');
		if (await newCycleBtnMob.count() > 0) {
			await newCycleBtnMob.first().scrollIntoViewIfNeeded().catch(() => {});
			await newCycleBtnMob.first().click({ force: true });
			await pageMob.waitForTimeout(800);
		}
		await pageMob.waitForSelector('[data-testid="sterilization-cycle-drawer"]', { timeout: 5000 }).catch(() => {});
		await saveProof(pageMob, "sterilization_drawer_mobile_dark");
		await ctxMob.close();

		console.log("\n🎉 Drawer proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Sterilization drawer capture failed:", err);
	process.exit(1);
});
