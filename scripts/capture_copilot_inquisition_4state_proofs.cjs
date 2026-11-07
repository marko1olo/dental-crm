const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "cda5f213-5e9a-4920-aa66-b96359358673";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(500);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, timeout: 15000 });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(400);
}

async function run() {
	console.log("[Inquisition Proofs] Launching Playwright Chromium...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ================= PC CONTEXT (1440x900) =================
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(800);

		// 1. Студия Копайлота PC Light & Dark
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "copilot_studio_pc_light_1440x900.png");

		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "copilot_studio_pc_dark_1440x900.png");

		// Открываем Настройки Копайлота
		const settingsBtn = pcPage.locator('[data-testid="copilot-settings-trigger"]').first();
		await settingsBtn.waitFor({ state: "visible", timeout: 10000 });
		await settingsBtn.click({ force: true });
		await pcPage.waitForSelector('[data-testid="copilot-settings-intelligence-tab"], [data-testid="copilot-settings-modal-root"]', { state: "visible", timeout: 10000 });
		await pcPage.waitForTimeout(600);

		// 2. Настройки PC Dark & Light
		await saveProof(pcPage, "copilot_settings_pc_dark_1440x900.png");
		await saveProof(pcPage, "02_copilot_settings_pc_dark_1440x900.png");

		await setTheme(pcPage, "light");
		await saveProof(pcPage, "copilot_settings_pc_light_1440x900.png");
		await saveProof(pcPage, "01_copilot_settings_pc_light_1440x900.png");

		// Переключаемся на вкладку "Уровень доверия"
		const trustTabBtn = pcPage.locator('button:has-text("Уровень доверия")').first();
		if (await trustTabBtn.isVisible()) {
			await trustTabBtn.click({ force: true });
			await pcPage.waitForTimeout(400);
			await saveProof(pcPage, "copilot_settings_trust_tab_pc_light_1440x900.png");
		}

		// Переключаемся на вкладку "Профиль врача"
		const personaTabBtn = pcPage.locator('button:has-text("Профиль врача")').first();
		if (await personaTabBtn.isVisible()) {
			await personaTabBtn.click({ force: true });
			await pcPage.waitForTimeout(400);
			await saveProof(pcPage, "copilot_settings_persona_tab_pc_light_1440x900.png");
		}

		// Закрываем модалку настроек
		const closeSettingsBtn = pcPage.locator('[data-testid="copilot-settings-close-btn"], button[aria-label="Закрыть"]').first();
		if (await closeSettingsBtn.isVisible()) {
			await closeSettingsBtn.click({ force: true });
			await pcPage.waitForTimeout(500);
		}

		// Открываем Историю диалогов
		const historyTriggerBtn = pcPage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await historyTriggerBtn.isVisible()) {
			await historyTriggerBtn.click({ force: true });
			await pcPage.waitForTimeout(600);
			await saveProof(pcPage, "copilot_history_pc_light_1440x900.png");

			await setTheme(pcPage, "dark");
			await saveProof(pcPage, "copilot_history_pc_dark_1440x900.png");
		}

		await pcContext.close();

		// ================= MOBILE CONTEXT (390x844) =================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		const mobPage = await mobileContext.newPage();
		await mobPage.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await mobPage.waitForTimeout(800);

		// Mobile Studio Light & Dark
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "copilot_studio_mobile_light_390x844.png");

		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "copilot_studio_mobile_dark_390x844.png");

		// Mobile Settings
		const mobSettingsBtn = mobPage.locator('[data-testid="copilot-settings-trigger"]').first();
		if (await mobSettingsBtn.isVisible()) {
			await mobSettingsBtn.click({ force: true });
			await mobPage.waitForTimeout(800);
			await setTheme(mobPage, "light");
			await saveProof(mobPage, "copilot_settings_mobile_light_390x844.png");
			await saveProof(mobPage, "03_copilot_mobile_light_390x844.png");

			await setTheme(mobPage, "dark");
			await saveProof(mobPage, "copilot_settings_mobile_dark_390x844.png");
			await saveProof(mobPage, "04_copilot_mobile_dark_390x844.png");
		}

		await mobileContext.close();
		console.log("[Inquisition Proofs] All proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Inquisition Proofs Error]:", err);
	process.exit(1);
});
