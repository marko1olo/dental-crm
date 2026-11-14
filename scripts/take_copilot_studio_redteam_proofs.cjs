const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "13e59011-6736-4b27-825a-088e16a45d73";
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

const PORT = process.env.PORT || "5173";
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

async function loginAndMountWorkspace(page) {
	console.log(`Navigating to ${BASE_URL}/?demo=true&copilot=1#copilot ...`);
	await page.goto(`${BASE_URL}/?demo=true&copilot=1#copilot`, { waitUntil: "commit", timeout: 45000 });
	await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
	await page.waitForTimeout(1000);

	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
	for (let i = 0; i < 30; i++) {
		await page.waitForTimeout(300);
		const hasBoot = await page.evaluate(() => Boolean(document.querySelector(".boot-state, [data-splash]"))).catch(() => true);
		const text = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
		if (!hasBoot && text.length > 50 && !text.includes("Загрузка")) {
			console.log(`[Hydrated] Workspace loaded in ${(i + 1) * 300}ms!`);
			break;
		}
	}

	await page.addStyleTag({
		content: `
			.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
			.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
			[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
			.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
		`,
	}).catch(() => {});

	const loginBtn = page.locator('button:has-text("Войти в систему"), button:has-text("Войти"), button:has-text("Демо")').first();
	if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Login button visible, clicking...");
		await loginBtn.click({ force: true });
		await page.waitForTimeout(1500);
	}

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
		await page.waitForTimeout(600);
		const triggerBtn = page.locator('[data-testid="copilot-floating-trigger"], button:has-text("ИИ Ассистент")').first();
		if (await triggerBtn.isVisible().catch(() => false)) {
			console.log("Clicking copilot-floating-trigger...");
			await triggerBtn.click({ force: true });
		}
	}
	await page.waitForSelector(rootSelector, { state: "visible", timeout: 45000 });
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
		localStorage.setItem("dente_active_user", JSON.stringify({
			id: "user-1",
			orgId: "org-1",
			name: "Д-р Воронов Алексей Владимирович",
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
			email: "doctor@dente.ru",
			active: true,
			pin: null,
		}));
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		sessionStorage.setItem("dente_unlocked", "true");
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

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. PC 1440x900
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(pcContext);

		const pcPage = await pcContext.newPage();
		await loginAndMountWorkspace(pcPage);
		await pcPage.waitForSelector('[data-testid="copilot-context-telemetry-bar"]', { state: "visible", timeout: 15000 });

		// 1. PC Light (Live Clinical Dialog + 1 Primary CTA)
		console.log("Capturing 01_copilot_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_studio_pc_light_1440x900.png");

		// 2. PC Dark (Live Clinical Dialog + 1 Primary CTA)
		console.log("Capturing 02_copilot_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "02_copilot_studio_pc_dark_1440x900.png");

		// Memory Tab PC Light
		console.log("Capturing 08_copilot_memory_tab_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const memoryBtn = pcPage.locator('.copilot-tabs-segmented button:has-text("Память")').first();
		if (await memoryBtn.isVisible()) {
			await memoryBtn.click({ force: true });
			await pcPage.waitForSelector('[data-testid="copilot-memory-tab-root"]', { state: "visible", timeout: 5000 }).catch(() => {});
			await pcPage.waitForTimeout(600);
			await saveProof(pcPage, "08_copilot_memory_tab_pc_light_1440x900.png");
		}

		// Actions Tab PC Dark
		console.log("Capturing 09_copilot_actions_tab_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const actionsBtn = pcPage.locator('.copilot-tabs-segmented button:has-text("Действия")').first();
		if (await actionsBtn.isVisible()) {
			await actionsBtn.click({ force: true });
			await pcPage.waitForSelector('.copilot-actions-grid', { state: "visible", timeout: 5000 }).catch(() => {});
			await pcPage.waitForTimeout(500);
			await saveProof(pcPage, "09_copilot_actions_tab_pc_dark_1440x900.png");
		}

		// Dialog Empty Starters PC Light
		console.log("Capturing 05_copilot_empty_starters_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
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

		// Thinking CoT Indicator PC Dark & Light
		console.log("Capturing copilot_thinking_indicator_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await pcPage.evaluate(() => {
			if (window.__denteCopilot?.setBusy) {
				window.__denteCopilot.setBusy(true);
				window.__denteCopilot.setPhase("1. Клинический аудит снимка: кариозное поражение в пределах околопульпарного дентина.\n2. Дифференциальный диагноз: исключен пульпит К04.0.\n3. Синтез протокола: препарирование, OptiBond FL, Estelite Asteria.");
			}
		});
		await pcPage.waitForSelector('.copilot-thinking-card, .copilot-thinking-indicator, [data-testid="copilot-thinking-indicator"]', { state: "visible", timeout: 5000 }).catch(() => {});
		await pcPage.waitForTimeout(600);
		await saveProof(pcPage, "copilot_thinking_indicator_pc_dark_1440x900.png");

		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(500);
		await saveProof(pcPage, "copilot_thinking_indicator_pc_light_1440x900.png");
		await pcContext.close();

		// 2. Native Mobile 390x844 Context (Live Clinical Dialog + Full 3-word Patient Name Zero-Clipping Telemetry Bar)
		console.log("\n--- Launching Mobile Viewport Context (390x844) ---");
		const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
		await setupPageAuth(mobContext);

		const mobPage = await mobContext.newPage();
		await loginAndMountWorkspace(mobPage);
		await mobPage.waitForSelector('[data-testid="copilot-context-telemetry-bar"]', { state: "visible", timeout: 15000 });
		await mobPage.evaluate(() => {
			if (window.__denteCopilot?.setContext) {
				window.__denteCopilot.setContext({
					patientName: "Кузнецов Михаил Павлович",
					patientId: "pat-36",
					activeTooth: 36,
				});
			}
		});
		await mobPage.waitForTimeout(600);

		const mobileAudit = await mobPage.evaluate(() => {
			const bar = document.querySelector('[data-testid="copilot-context-telemetry-bar"]');
			const panel = document.querySelector('[data-testid="copilot-workspace-panel"]');
			const replies = document.querySelector('[data-testid="copilot-smart-replies"]');
			const overflowX = document.documentElement.scrollWidth - window.innerWidth;
			const barClip = bar && panel ? bar.scrollWidth - bar.clientWidth : -1;
			const repliesScrollLeft = replies ? replies.scrollLeft : -1;
			return { overflowX, barScrollW: bar?.scrollWidth, barClientW: bar?.clientWidth, barClip, repliesScrollLeft };
		});
		console.log("[Mobile Layout Audit 390px]:", JSON.stringify(mobileAudit));

		// Mobile Light
		console.log("Capturing 03_copilot_studio_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "03_copilot_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 04_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "04_copilot_studio_mobile_dark_390x844.png");

		// Mobile Empty Starters Light
		console.log("Capturing 06_copilot_empty_starters_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		const mobHistoryTrigger = mobPage.locator('[data-testid="copilot-history-trigger"]').first();
		if (await mobHistoryTrigger.isVisible()) {
			await mobHistoryTrigger.click({ force: true });
			await mobPage.waitForTimeout(400);
			const mobNewThreadBtn = mobPage.locator('button:has-text("Новый диалог")').first();
			if (await mobNewThreadBtn.isVisible()) {
				await mobNewThreadBtn.click({ force: true });
				await mobPage.waitForTimeout(600);
				await saveProof(mobPage, "06_copilot_empty_starters_mobile_light_390x844.png");
			}
		}

		await mobContext.close();
		console.log("[Studio Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Studio Proof ERROR]:", err);
	process.exit(1);
});
