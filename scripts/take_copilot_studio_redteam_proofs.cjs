const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "94fdd0cf-c71a-4cea-8738-53c01dc29f47";
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

	// Канонические алиасы без префикса
	const aliasMap = {
		"01_copilot_studio_pc_light_1440x900.png": "copilot_studio_pc_light_1440x900.png",
		"02_copilot_studio_pc_dark_1440x900.png": "copilot_studio_pc_dark_1440x900.png",
		"03_copilot_studio_mobile_light_390x844.png": "copilot_studio_mobile_light_390x844.png",
		"04_copilot_studio_mobile_dark_390x844.png": "copilot_studio_mobile_dark_390x844.png",
	};
	if (aliasMap[filename]) {
		const aliasName = aliasMap[filename];
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, aliasName));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, aliasName));
		console.log(`[Captured Alias] ${aliasName} synced.`);
	}
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

async function loginAndMountWorkspace(page) {
	console.log("Navigating to http://127.0.0.1:5173/?demo=true&copilot=1#copilot ...");
	await page.goto("http://127.0.0.1:5173/?demo=true&copilot=1#copilot", { waitUntil: "domcontentloaded", timeout: 35000 });
	await page.waitForTimeout(1000);
	const rootSelector = '[data-testid="chairside-copilot-studio-root"]';
	let isRootVisible = await page.locator(rootSelector).isVisible().catch(() => false);
	if (!isRootVisible) {
		console.log("Studio root not immediately visible, dispatching open-copilot event...");
		await page.evaluate(() => {
			if (window.__denteCopilot?.open) {
				window.__denteCopilot.open();
			}
			window.location.hash = "#copilot";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36"
				}
			}));
		});
		const triggerBtn = page.locator('[data-testid="copilot-floating-trigger"], button:has-text("ИИ Ассистент")').first();
		if (await triggerBtn.isVisible().catch(() => false)) {
			console.log("Clicking copilot-floating-trigger...");
			await triggerBtn.click({ force: true });
		}
	}
	await page.waitForSelector(rootSelector, { state: "visible", timeout: 15000 });
	console.log("Copilot Studio successfully mounted!");
	await page.waitForTimeout(600);
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_organization_id", "org-1");
		localStorage.setItem("dente_clinic_token", "test-clinic-token-123");
		localStorage.setItem("dente_staff_token", "test-staff-token-456");
		localStorage.setItem("dente_active_session_token", "mock-session-token");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			theme: "light",
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	});
}

async function run() {
	console.log("[Studio Proof Runner] Launching Playwright Chrome for Copilot Studio Proofs...");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. PC 1440x900
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(pcContext);

		const pcPage = await pcContext.newPage();
		await loginAndMountWorkspace(pcPage);

		// 1. PC Light
		console.log("Capturing 01_copilot_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_studio_pc_light_1440x900.png");

		// Memory Tab PC Light
		console.log("Capturing 08_copilot_memory_tab_pc_light_1440x900.png...");
		const memoryBtn = pcPage.locator('.copilot-tabs-segmented button:has-text("Память")').first();
		if (await memoryBtn.isVisible()) {
			await memoryBtn.click({ force: true });
			await pcPage.waitForSelector('[data-testid="copilot-memory-tab-root"]', { state: "visible", timeout: 5000 }).catch(() => {});
			await pcPage.waitForTimeout(600);
			await saveProof(pcPage, "08_copilot_memory_tab_pc_light_1440x900.png");
		}

		// Dialog Empty Starters PC Light
		console.log("Capturing 05_copilot_empty_starters_pc_light_1440x900.png...");
		const dialogTabBtn = pcPage.locator('.copilot-tabs-segmented button:has-text("Диалог")').first();
		if (await dialogTabBtn.isVisible()) await dialogTabBtn.click({ force: true });
		const historyTrigger = pcPage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await historyTrigger.isVisible()) {
			await historyTrigger.click({ force: true });
			await pcPage.waitForTimeout(400);
			const newThreadBtn = pcPage.locator('button:has-text("Новый диалог")').first();
			if (await newThreadBtn.isVisible()) {
				await newThreadBtn.click({ force: true });
				await pcPage.waitForTimeout(600);
				await saveProof(pcPage, "05_copilot_empty_starters_pc_light_1440x900.png");
			}
		}

		// 2. PC Dark
		console.log("Capturing 02_copilot_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "02_copilot_studio_pc_dark_1440x900.png");

		// Actions Tab PC Dark
		console.log("Capturing 09_copilot_actions_tab_pc_dark_1440x900.png...");
		const actionsBtn = pcPage.locator('.copilot-tabs-segmented button:has-text("Действия")').first();
		if (await actionsBtn.isVisible()) {
			await actionsBtn.click({ force: true });
			await pcPage.waitForSelector('.copilot-actions-grid', { state: "visible", timeout: 5000 }).catch(() => {});
			await pcPage.waitForTimeout(500);
			await saveProof(pcPage, "09_copilot_actions_tab_pc_dark_1440x900.png");
		}

		// Thinking CoT Indicator PC Dark & Light
		console.log("Capturing copilot_thinking_indicator_pc_dark_1440x900.png...");
		const dialogTabDark = pcPage.locator('.copilot-tabs-segmented button:has-text("Диалог")').first();
		if (await dialogTabDark.isVisible()) await dialogTabDark.click({ force: true });
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36",
					isThinking: true,
					thoughtProcess: "1. Клинический аудит снимка: кариозное поражение в пределах околопульпарного дентина.\n2. Дифференциальный диагноз: исключен пульпит К04.0.\n3. Синтез протокола: препарирование, OptiBond FL, Estelite Asteria."
				}
			}));
		});
		await pcPage.waitForSelector('.copilot-thinking-card, .copilot-thinking-indicator, [data-testid="copilot-thinking-indicator"]', { state: "visible", timeout: 5000 }).catch(() => {});
		await pcPage.waitForTimeout(600);
		await saveProof(pcPage, "copilot_thinking_indicator_pc_dark_1440x900.png");

		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "copilot_thinking_indicator_pc_light_1440x900.png");

		// 2. Mobile 390x844 (Resize viewport on live mounted workspace)
		console.log("\n--- Switching to Mobile Viewport (390x844) ---");
		await pcPage.setViewportSize({ width: 390, height: 844 });
		await pcPage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing 03_copilot_studio_mobile_light_390x844.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "03_copilot_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 04_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "04_copilot_studio_mobile_dark_390x844.png");

		// Mobile Empty Starters Light
		console.log("Capturing 06_copilot_empty_starters_mobile_light_390x844.png...");
		await setTheme(pcPage, "light");
		const mobHistoryTrigger = pcPage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await mobHistoryTrigger.isVisible()) {
			await mobHistoryTrigger.click({ force: true });
			await pcPage.waitForTimeout(400);
			const mobNewThreadBtn = pcPage.locator('button:has-text("Новый диалог")').first();
			if (await mobNewThreadBtn.isVisible()) {
				await mobNewThreadBtn.click({ force: true });
				await pcPage.waitForTimeout(600);
				await saveProof(pcPage, "06_copilot_empty_starters_mobile_light_390x844.png");
			}
		}

		await pcContext.close();
		console.log("[Studio Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Studio Proof ERROR]:", err);
	process.exit(1);
});
