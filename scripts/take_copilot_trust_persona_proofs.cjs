const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "43dad63c-9d6c-414c-9d98-6232d426e61a";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 25000}`);
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
	}, theme);
	await page.waitForTimeout(500);
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	});
}

async function run() {
	console.log("[Trust & Persona Proof Runner] Launching Playwright...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(pcContext);
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
		for (let i = 0; i < 30; i++) {
			await pcPage.waitForTimeout(400);
			const text = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
			if (!text.includes("Загрузка") && text.length > 200) break;
		}
		await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-grid-view"]', { timeout: 15000 }).catch(() => {});
		await pcPage.waitForTimeout(800);

		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36"
				}
			}));
		});
		await pcPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(1000);

		const settingsBtn = pcPage.locator('[data-testid="copilot-settings-trigger"]').first();
		await settingsBtn.waitFor({ state: "visible", timeout: 10000 });
		await settingsBtn.click({ force: true });
		await pcPage.waitForTimeout(1000);

		// 1. Trust Tab PC Light
		console.log("Capturing 11_copilot_settings_trust_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const trustTabBtn = pcPage.locator('button:has-text("Уровень доверия")').first();
		await trustTabBtn.click({ force: true });
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "11_copilot_settings_trust_pc_light_1440x900.png");

		// 2. Persona Tab PC Dark
		console.log("Capturing 12_copilot_settings_persona_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const personaTabBtn = pcPage.locator('button:has-text("Профиль врача")').first();
		await personaTabBtn.click({ force: true });
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "12_copilot_settings_persona_pc_dark_1440x900.png");

		await pcContext.close();

		// 3. Mobile 390x844
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		await setupPageAuth(mobContext);
		const mobPage = await mobContext.newPage();
		await mobPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "domcontentloaded", timeout: 60000 });
		for (let i = 0; i < 30; i++) {
			await mobPage.waitForTimeout(400);
			const text = await mobPage.evaluate(() => document.body ? document.body.innerText : "");
			if (!text.includes("Загрузка") && text.length > 200) break;
		}
		await mobPage.waitForTimeout(800);

		await mobPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36"
				}
			}));
		});
		await mobPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await mobPage.waitForTimeout(800);
		const mobSettingsBtn = mobPage.locator('[data-testid="copilot-settings-trigger"]').first();
		await mobSettingsBtn.waitFor({ state: "visible", timeout: 10000 });
		await mobSettingsBtn.click({ force: true });
		await mobPage.waitForTimeout(1000);

		console.log("Capturing 13_copilot_settings_trust_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		const mobTrustBtn = mobPage.locator('button:has-text("Уровень доверия")').first();
		await mobTrustBtn.click({ force: true });
		await mobPage.waitForTimeout(500);
		await saveProof(mobPage, "13_copilot_settings_trust_mobile_light_390x844.png");

		console.log("Capturing 14_copilot_settings_trust_mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await mobPage.waitForTimeout(500);
		await saveProof(mobPage, "14_copilot_settings_trust_mobile_dark_390x844.png");

		await mobContext.close();
		console.log("[Trust & Persona Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Trust & Persona Proof ERROR]:", err);
	process.exit(1);
});
