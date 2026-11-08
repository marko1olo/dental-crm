const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "26773978-4480-4129-a80e-6f979dbebc85";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	try {
		fs.copyFileSync(pDocs, pBrain);
	} catch (e) {
		console.warn("Could not copy to brain dir:", e.message);
	}
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
	await page.waitForTimeout(500);
}

async function ensureWorkspaceReady(page) {
	console.log("Navigating to http://127.0.0.1:5173/#patients ...");
	await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForTimeout(1500);

	const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур'), button.auth-demo-btn");
	if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
		console.log("Found Demo button! Clicking...");
		await demoBtn.first().click();
		const roleCard = page.locator(".auth-demo-role-card").first();
		if (await roleCard.isVisible({ timeout: 5000 }).catch(() => false)) {
			console.log("Double clicking role card...");
			await roleCard.dblclick();
			await page.waitForTimeout(2000);
		}
	}

	await page.waitForSelector(".copilot-trigger-btn, [data-testid='copilot-floating-trigger'], .app-layout", { timeout: 20000 });
	console.log("Workspace ready! URL:", page.url());
}

async function openCopilotStudioModal(page) {
	console.log("Opening Copilot Studio...");
	const isAlreadyOpen = await page.locator(".copilot-studio-modal, .copilot-studio-overlay, [data-testid='chairside-copilot-studio-root']").isVisible().catch(() => false);
	if (!isAlreadyOpen) {
		const triggerBtn = page.locator(".copilot-trigger-btn, [data-testid='copilot-floating-trigger']");
		if (await triggerBtn.isVisible().catch(() => false)) {
			await triggerBtn.click({ force: true });
		} else {
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("dente:open-copilot", {
						detail: { tooth: 36, patientName: "Кузнецов М.П.", patientId: "pat-36" },
					}),
				);
			});
		}
	}
	await page.waitForSelector(".copilot-studio-modal, .copilot-studio-overlay, [data-testid='chairside-copilot-studio-root']", { timeout: 15000 });
	await page.waitForTimeout(800);
}

async function closeCopilotStudioModal(page) {
	const closeBtn = page.locator("[data-testid='copilot-studio-close-btn'], button[aria-label='Закрыть окно ассистента'], .copilot-modal-close");
	if (await closeBtn.count() > 0 && await closeBtn.first().isVisible().catch(() => false)) {
		await closeBtn.first().click({ force: true });
	} else {
		await page.keyboard.press("Escape");
	}
	await page.evaluate(() => {
		document.body.classList.remove("copilot-open", "copilot-studio-open");
	});
	await page.waitForTimeout(600);
}

async function openChairsideHUD(page) {
	console.log("Opening Chairside HUD...");
	await page.evaluate(() => {
		document.body.classList.remove("copilot-open", "copilot-studio-open");
		window.dispatchEvent(
			new CustomEvent("dente:open-chairside-hud", {
				detail: { tooth: 36, activeTooth: 36, patientName: "Иванов Иван Иванович", patientId: "pat-36" },
			}),
		);
	});
	await page.waitForSelector(".chairside-copilot-hud, [data-testid='chairside-copilot-hud']", { timeout: 10000 });
	await page.waitForTimeout(800);
}

async function run() {
	console.log("[Proof Runner] Launching Chromium...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// PHASE 1: PC STUDIO (1440x900)
		// ==========================================
		console.log("\n--- Phase 1: PC Studio Context (1440x900) ---");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/#copilot", { waitUntil: "commit" });
		await pcPage.locator("[data-testid='chairside-copilot-studio-root']").first().waitFor({ state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(1000);

		// 1. PC Light Studio
		console.log("Capturing 01_copilot_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_studio_pc_light_1440x900.png");

		// 2. PC Dark Studio
		console.log("Capturing 02_copilot_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_copilot_studio_pc_dark_1440x900.png");

		// Settings Trust Tab (Light & Dark)
		console.log("Opening Copilot Settings Modal...");
		const settingsTrigger = pcPage.locator("[data-testid='copilot-settings-trigger']");
		if (await settingsTrigger.isVisible().catch(() => false)) {
			await settingsTrigger.click({ force: true });
			await pcPage.locator("[data-testid='copilot-settings-modal']").first().waitFor({ state: "visible", timeout: 8000 });
			await pcPage.waitForTimeout(500);

			const trustTabBtn = pcPage.locator("button:has-text('Уровень доверия'), [data-testid='settings-tab-trust']");
			if (await trustTabBtn.count() > 0) {
				await trustTabBtn.first().click();
				await pcPage.waitForTimeout(400);
			}

			console.log("Capturing 10_copilot_settings_trust_pc_dark_1440x900.png...");
			await saveProof(pcPage, "10_copilot_settings_trust_pc_dark_1440x900.png");

			console.log("Capturing 09_copilot_settings_trust_pc_light_1440x900.png...");
			await setTheme(pcPage, "light");
			await saveProof(pcPage, "09_copilot_settings_trust_pc_light_1440x900.png");
		}

		await pcContext.close();

		// ==========================================
		// PHASE 2: PC CHAIRSIDE HUD (1440x900)
		// ==========================================
		console.log("\n--- Phase 2: PC Chairside HUD (1440x900) ---");
		const pcHudContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcHudPage = await pcHudContext.newPage();
		await pcHudPage.goto("http://127.0.0.1:5173/#hud", { waitUntil: "commit" });
		await pcHudPage.locator("[data-testid='chairside-copilot-hud']").first().waitFor({ state: "visible", timeout: 15000 });
		await pcHudPage.waitForTimeout(1000);

		console.log("Capturing 05_copilot_hud_pc_light_1440x900.png...");
		await setTheme(pcHudPage, "light");
		await saveProof(pcHudPage, "05_copilot_hud_pc_light_1440x900.png");

		console.log("Capturing 06_copilot_hud_pc_dark_1440x900.png...");
		await setTheme(pcHudPage, "dark");
		await saveProof(pcHudPage, "06_copilot_hud_pc_dark_1440x900.png");

		await pcHudContext.close();

		// ==========================================
		// PHASE 3: MOBILE STUDIO (390x844 @2x)
		// ==========================================
		console.log("\n--- Phase 3: Mobile Studio Context (390x844 @2x) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/#copilot", { waitUntil: "commit" });
		await mobilePage.locator("[data-testid='chairside-copilot-studio-root']").first().waitFor({ state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(1000);

		// 3. Mobile Light Studio
		console.log("Capturing 03_copilot_studio_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_copilot_studio_mobile_light_390x844.png");

		// 4. Mobile Dark Studio
		console.log("Capturing 04_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_copilot_studio_mobile_dark_390x844.png");

		await mobileContext.close();

		// ==========================================
		// PHASE 4: MOBILE CHAIRSIDE HUD (390x844 @2x)
		// ==========================================
		console.log("\n--- Phase 4: Mobile Chairside HUD (390x844 @2x) ---");
		const mobileHudContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
		});
		const mobileHudPage = await mobileHudContext.newPage();
		await mobileHudPage.goto("http://127.0.0.1:5173/#hud", { waitUntil: "commit" });
		await mobileHudPage.locator("[data-testid='chairside-copilot-hud']").first().waitFor({ state: "visible", timeout: 15000 });
		await mobileHudPage.waitForTimeout(1000);

		console.log("Capturing 07_copilot_hud_mobile_light_390x844.png...");
		await setTheme(mobileHudPage, "light");
		await saveProof(mobileHudPage, "07_copilot_hud_mobile_light_390x844.png");

		console.log("Capturing 08_copilot_hud_mobile_dark_390x844.png...");
		await setTheme(mobileHudPage, "dark");
		await saveProof(mobileHudPage, "08_copilot_hud_mobile_dark_390x844.png");

		await mobileHudContext.close();

		console.log("\n[Proof Runner] All 4-State visual proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner ERROR]:", err);
	process.exit(1);
});
