import { mkdir, stat, copyFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e885d1bc-6630-4cff-a78a-b5844a9db4d8/screenshots";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(PROOFS_DIR, { recursive: true });
await mkdir(BRAIN_DIR, { recursive: true });

async function initContextStorage(context, theme) {
	await context.addInitScript(({ themeMode }) => {
		const dummyUser = {
			id: "demo-nurse-cssd",
			fullName: "Медсестра ЦСО Смирнова Елена",
			role: "assistant",
		};
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_active_role", "assistant");
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
			await offlineBtn.click({ force: true });
			await page.waitForTimeout(600);
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

	await page.waitForTimeout(600);
}

async function saveProof(page, baseName) {
	const p1 = path.join(PROOFS_DIR, `${baseName}.png`);
	const p2 = path.join(BRAIN_DIR, `${baseName}.png`);
	await page.screenshot({ path: p1, fullPage: false });
	await copyFile(p1, p2);

	// Also make alias copy without dimensions suffix
	const aliasName = baseName.replace(/_\d+x\d+$/, "");
	if (aliasName !== baseName) {
		const pAlias = path.join(PROOFS_DIR, `${aliasName}.png`);
		await copyFile(p1, pAlias);
	}

	const st = await stat(p1);
	console.log(`[Screenshot] Saved: ${baseName}.png (${(st.size / 1024).toFixed(1)} KB)`);
}

async function run() {
	console.log("Launching Chromium for 4-State Red Team Proofs...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	}

	const targetUrl = `${WEB_URL}/?demo=true#scanner`;

	try {
		// 1. PC Light (1440x900)
		console.log("\n--- 1. Capturing PC Light (1440x900) ---");
		const contextPcLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await initContextStorage(contextPcLight, "light");
		const pagePcLight = await contextPcLight.newPage();
		await pagePcLight.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await pagePcLight.waitForTimeout(2000);
		await prepareAndClean(pagePcLight, "light");
		await pagePcLight.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });
		const autoclaveTabLight = pagePcLight.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabLight.count() > 0) {
			await autoclaveTabLight.click({ force: true });
			await pagePcLight.waitForTimeout(600);
		}
		await saveProof(pagePcLight, "sterilization_pc_light_1440x900");
		await contextPcLight.close();

		// 2. PC Dark (1440x900)
		console.log("\n--- 2. Capturing PC Dark (1440x900) ---");
		const contextPcDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "dark",
		});
		await initContextStorage(contextPcDark, "dark");
		const pagePcDark = await contextPcDark.newPage();
		await pagePcDark.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await pagePcDark.waitForTimeout(2000);
		await prepareAndClean(pagePcDark, "dark");
		await pagePcDark.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });
		const autoclaveTabDark = pagePcDark.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabDark.count() > 0) {
			await autoclaveTabDark.click({ force: true });
			await pagePcDark.waitForTimeout(600);
		}
		await saveProof(pagePcDark, "sterilization_pc_dark_1440x900");
		await contextPcDark.close();

		// 3. Mobile Light (390x844)
		console.log("\n--- 3. Capturing Mobile Light (390x844) ---");
		const contextMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await initContextStorage(contextMobLight, "light");
		const pageMobLight = await contextMobLight.newPage();
		await pageMobLight.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await pageMobLight.waitForTimeout(2000);
		await prepareAndClean(pageMobLight, "light");
		await pageMobLight.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });
		const autoclaveTabMobLight = pageMobLight.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabMobLight.count() > 0) {
			await autoclaveTabMobLight.click({ force: true });
			await pageMobLight.waitForTimeout(600);
		}
		await saveProof(pageMobLight, "sterilization_mobile_light_390x844");
		await contextMobLight.close();

		// 4. Mobile Dark (390x844)
		console.log("\n--- 4. Capturing Mobile Dark (390x844) ---");
		const contextMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		await initContextStorage(contextMobDark, "dark");
		const pageMobDark = await contextMobDark.newPage();
		await pageMobDark.goto(targetUrl, { waitUntil: "commit", timeout: 45000 });
		await pageMobDark.waitForTimeout(2000);
		await prepareAndClean(pageMobDark, "dark");
		await pageMobDark.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });
		const autoclaveTabMobDark = pageMobDark.locator('[data-testid="tab-autoclave-btn"]');
		if (await autoclaveTabMobDark.count() > 0) {
			await autoclaveTabMobDark.click({ force: true });
			await pageMobDark.waitForTimeout(600);
		}
		await saveProof(pageMobDark, "sterilization_mobile_dark_390x844");
		await contextMobDark.close();

		console.log("\nAll 4-state visual proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("4-state capture failed:", err);
	process.exit(1);
});
