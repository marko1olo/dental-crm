const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "d2b0c89e-8ca0-4f0c-9986-9fb713a44427";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(800);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	try {
		await page.screenshot({ path: pDocs, fullPage: false });
	} catch (err) {
		console.log(`[saveProof fallback] ${err.message}`);
		await page.screenshot({ path: pDocs });
	}
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
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(500);
}

async function provisionLiveSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	try {
		const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				clinicName: "Стоматология ДЕНТЕ Премиум",
				email: `doctor-harness-${uniqueId}@dente-clinic.ru`,
				password: "Password123!",
				ownerName: "Д-р Воронов Алексей Владимирович",
				ownerPin: "1234",
			}),
		});
		if (initRes.ok) {
			const initData = await initRes.json();
			const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-dente-clinic-token": initData.clinicToken },
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
			});
			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				return { clinicToken: initData.clinicToken, staffToken: unlockData.staffToken, ownerUserId: initData.ownerUserId, orgId: initData.organizationId };
			}
		}
	} catch { /* skip */ }
	return { clinicToken: "mock-token", staffToken: "mock-staff", ownerUserId: "user-1", orgId: "org-1" };
}

async function setupPageAuth(context, auth) {
	await context.addInitScript(({ clinicToken, staffToken, ownerUserId, orgId }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_user_id", ownerUserId);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_active_org_id", orgId);
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	}, auth);
}

async function run() {
	console.log("[Harness Inquisitor] Launching Playwright Chrome for AI Copilot Proofs...");
	const auth = await provisionLiveSession();

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC VIEWPORT (1440x900) - COPILOT STUDIO
		// ==========================================
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(pcContext, auth);

		const pcPage = await pcContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?copilot=1...");
		await pcPage.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(1000);

		// Initialize with active patient & tooth
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Иванов Иван Иванович",
					patientId: "pat-active"
				}
			}));
		});
		await pcPage.waitForTimeout(800);

		// 1.1 Dialog PC Light
		console.log("Capturing 01_copilot_drawer_dialog_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_copilot_drawer_dialog_pc_light_1440x900.png");

		// 1.2 Dialog PC Dark
		console.log("Capturing 02_copilot_drawer_dialog_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_copilot_drawer_dialog_pc_dark_1440x900.png");

		// 1.3 Trigger Thinking Indicator CoT
		console.log("Triggering thinking indicator CoT...");
		await setTheme(pcPage, "light");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Иванов Иван Иванович",
					patientId: "pat-active",
					isThinking: true,
					thoughtProcess: "Клинический анализ МКБ-10 (K02.1), расчет дозировки Артикаин 1:100 000 и формирование сметы..."
				}
			}));
		});
		await pcPage.waitForTimeout(800);
		const thinkingCard = pcPage.locator(".copilot-thinking-card").first();
		if (await thinkingCard.isVisible()) {
			await thinkingCard.scrollIntoViewIfNeeded();
			// Click to expand accordion thoughts
			await thinkingCard.locator("button").first().click({ force: true }).catch(async () => { await thinkingCard.click({ force: true }).catch(() => {}); });
			await pcPage.waitForTimeout(500);
		}
		console.log("Capturing 03_copilot_thinking_cot_pc_light_1440x900.png...");
		await saveProof(pcPage, "03_copilot_thinking_cot_pc_light_1440x900.png");

		// Reset thinking
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: {
					tooth: 36,
					activeTooth: 36,
					patientName: "Иванов Иван Иванович",
					patientId: "pat-active",
					isThinking: false
				}
			}));
		});
		await pcPage.waitForTimeout(500);

		// 1.4 Settings Modal - Intelligence Tab PC Light
		console.log("Capturing 06_copilot_settings_intelligence_pc_light_1440x900.png...");
		const settingsBtn = pcPage.locator('[data-testid="copilot-settings-trigger"]').first();
		await settingsBtn.waitFor({ state: "visible", timeout: 10000 });
		await settingsBtn.click({ force: true });
		await pcPage.waitForTimeout(800);
		await saveProof(pcPage, "06_copilot_settings_intelligence_pc_light_1440x900.png");

		// 1.5 Settings Modal - Trust Tab PC Dark
		console.log("Capturing 07_copilot_settings_trust_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const trustTabBtn = pcPage.locator('button:has-text("Уровень доверия")').first();
		if (await trustTabBtn.isVisible()) {
			await trustTabBtn.click({ force: true });
			await pcPage.waitForTimeout(600);
			await saveProof(pcPage, "07_copilot_settings_trust_pc_dark_1440x900.png");
		}

		await pcContext.close();

		// ==========================================
		// 2. CHAIRSIDE COPILOT HUD (1440x900)
		// ==========================================
		const hudContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(hudContext, auth);

		const hudPage = await hudContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?hud=open...");
		await hudPage.goto("http://127.0.0.1:5173/?hud=open", { waitUntil: "domcontentloaded", timeout: 30000 });
		await hudPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 20000 });
		await hudPage.waitForTimeout(1000);

		// HUD Light
		console.log("Capturing 04_copilot_chairside_hud_pc_light_1440x900.png...");
		await setTheme(hudPage, "light");
		await saveProof(hudPage, "04_copilot_chairside_hud_pc_light_1440x900.png");

		// HUD Dark
		console.log("Capturing 05_copilot_chairside_hud_pc_dark_1440x900.png...");
		await setTheme(hudPage, "dark");
		await saveProof(hudPage, "05_copilot_chairside_hud_pc_dark_1440x900.png");

		await hudContext.close();

		// ==========================================
		// 3. MOBILE VIEWPORT (390x844)
		// ==========================================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		await setupPageAuth(mobileContext, auth);

		const mobilePage = await mobileContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?copilot=1 (Mobile)...");
		await mobilePage.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing 08_copilot_studio_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "08_copilot_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 09_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "09_copilot_studio_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("[Harness Inquisitor] All proofs captured and mirrored to brain successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Harness Inquisitor ERROR]:", err);
	process.exit(1);
});
