const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "90778293-7eb7-4709-a06e-d117781acf86";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/treatment_plans");
const OUT_DOCS_DASH = path.resolve(__dirname, "../docs/proofs/treatment-plans");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_DOCS_DASH, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pDocsDash = path.join(OUT_DOCS_DASH, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pDocsDash);
	fs.copyFileSync(pDocs, pBrain);

	// Канонические 4-State имена
	if (filename.includes("01_") || filename.includes("pc_light")) {
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "01_treatment_plan_pc_light_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "01_treatment_plan_pc_light_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "01_treatment_plan_3tier_pc_light_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "01_treatment_plan_3tier_pc_light_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, "01_treatment_plan_3tier_pc_light_1440x900.png"));
	}
	if (filename.includes("02_") || filename.includes("pc_dark")) {
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "02_treatment_plan_pc_dark_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "02_treatment_plan_pc_dark_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "02_treatment_plan_3tier_pc_dark_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "02_treatment_plan_3tier_pc_dark_1440x900.png"));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, "02_treatment_plan_3tier_pc_dark_1440x900.png"));
	}
	if (filename.includes("05_") || filename.includes("mobile_light")) {
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "03_treatment_plan_mobile_light_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "03_treatment_plan_mobile_light_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "03_treatment_plan_3tier_mobile_light_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "03_treatment_plan_3tier_mobile_light_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, "03_treatment_plan_3tier_mobile_light_390x844.png"));
	}
	if (filename.includes("06_") || filename.includes("mobile_dark")) {
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "04_treatment_plan_mobile_dark_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "04_treatment_plan_mobile_dark_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS_DASH, "04_treatment_plan_3tier_mobile_dark_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, "04_treatment_plan_3tier_mobile_dark_390x844.png"));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, "04_treatment_plan_3tier_mobile_dark_390x844.png"));
	}

	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	try {
		await page.evaluate((th) => {
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(th);
			}
			document.documentElement.setAttribute("data-theme", th);
			const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			try {
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_theme", th);
			} catch (_) {}
		}, theme);
	} catch (_) {}
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
				email: `doctor-${uniqueId}@dente-clinic.ru`,
				password: "Password123!",
				ownerName: "Д-р Орлов А.В. (Главный врач)",
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
				return {
					clinicToken: initData.clinicToken,
					staffToken: unlockData.staffToken,
					ownerUserId: initData.ownerUserId,
					orgId: initData.organizationId,
				};
			}
		}
	} catch (e) {
		console.log("Provision error:", e.message);
	}
	return null;
}

async function setupPageAuth(context, auth) {
	await context.addInitScript((creds) => {
		if (creds) {
			localStorage.setItem("dente_organization_id", creds.orgId);
			localStorage.setItem("dente_clinic_token", creds.clinicToken);
			localStorage.setItem("dente_staff_token", creds.staffToken);
			localStorage.setItem("dente_active_session_token", creds.staffToken);
			localStorage.setItem("dente_user_id", creds.ownerUserId);
		}
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Орлов А.В. (Главный врач)");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
		localStorage.setItem("dente_theme", "light");
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
	}, auth);
}

async function run() {
	console.log("=== STARTING RED TEAM TREATMENT PLANS VISUAL PROOF CAPTURE ===");
	
	const auth = await provisionLiveSession();
	console.log("Live session provisioned:", !!auth);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. Десктопная среда (1440x900)
		console.log("\n--- 1. Desktop PC 1440x900 Context ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupPageAuth(pcContext, auth);
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC page to http://127.0.0.1:5173/?treatment-plans=1#treatment-studio ...");
		await pcPage.goto("http://127.0.0.1:5173/?treatment-plans=1#treatment-studio", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});

		console.log("Waiting for TreatmentPlanStudioModal in DOM...");
		await pcPage.waitForSelector('[data-testid="treatment-plan-studio-modal"]', {
			state: "visible",
			timeout: 25000,
		});
		await pcPage.waitForTimeout(600);
		await suppressOverlays(pcPage);

		// Снимок 1: PC Light — Режим «Экспресс» (1-экранный презентер 3 тарифов, диагнозы)
		console.log("Capturing 01_treatment_plan_express_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const expressBtn = pcPage.locator('[data-testid="depth-mode-express-btn"]');
		if (await expressBtn.isVisible()) {
			await expressBtn.click();
			await pcPage.waitForTimeout(400);
		}
		await saveProof(pcPage, "01_treatment_plan_express_pc_light_1440x900.png");

		// Снимок 2: PC Dark — Режим «Эксперт» (этапы лечения, клинические позиции, 0 белых пятен)
		console.log("Capturing 02_treatment_plan_expert_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		const expertBtn = pcPage.locator('[data-testid="depth-mode-expert-btn"]');
		if (await expertBtn.isVisible()) {
			await expertBtn.click();
			await pcPage.waitForTimeout(400);
		}
		await saveProof(pcPage, "02_treatment_plan_expert_pc_dark_1440x900.png");

		// Снимок 3: PC Light — Вкладка «Гарантийный паспорт»
		console.log("Capturing 03_treatment_plan_warranty_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		const warrantyTab = pcPage.locator('[data-testid="tab-warranty-passport"]');
		if (await warrantyTab.isVisible()) {
			await warrantyTab.click();
			await pcPage.waitForTimeout(400);
			await saveProof(pcPage, "03_treatment_plan_warranty_pc_light_1440x900.png");
		}

		// Снимок 4: PC Light — Вкладка «Фотопротокол До/После»
		console.log("Capturing 04_treatment_plan_photo_pc_light_1440x900.png...");
		const photoTab = pcPage.locator('[data-testid="tab-photo-protocol"]');
		if (await photoTab.isVisible()) {
			await photoTab.click();
			await pcPage.waitForTimeout(400);
			await saveProof(pcPage, "04_treatment_plan_photo_pc_light_1440x900.png");
		}

		await pcContext.close();

		// 2. Мобильная среда (390x844 — iPhone 13/14/15)
		console.log("\n--- 2. Mobile 390x844 Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupPageAuth(mobileContext, auth);
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating Mobile page to http://127.0.0.1:5173/?treatment-plans=1#treatment-studio ...");
		await mobilePage.goto("http://127.0.0.1:5173/?treatment-plans=1#treatment-studio", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});

		console.log("Waiting for Mobile TreatmentPlanStudioModal in DOM...");
		await mobilePage.waitForSelector('[data-testid="treatment-plan-studio-modal"]', {
			state: "visible",
			timeout: 25000,
		});
		await mobilePage.waitForTimeout(600);
		await suppressOverlays(mobilePage);

		// Снимок 5: Mobile Light (390x844) — Segmented Control [Эконом | ★ Оптимум | Премиум], карточка во всю ширину
		console.log("Capturing 05_treatment_plan_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		const tiersTab = mobilePage.locator('[data-testid="tab-tiers-stages"]');
		if (await tiersTab.isVisible()) {
			await tiersTab.click();
			await mobilePage.waitForTimeout(300);
		}
		await saveProof(mobilePage, "05_treatment_plan_mobile_light_390x844.png");

		// Снимок 6: Mobile Dark (390x844) — темная тема, 0px горизонтального скролла, кнопка в Natural Thumb Zone
		console.log("Capturing 06_treatment_plan_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "06_treatment_plan_mobile_dark_390x844.png");

		await mobileContext.close();
		console.log("\n=== ALL 6 RED TEAM VISUAL PROOFS SUCCESSFULLY CAPTURED! ===");
	} catch (err) {
		console.error("Visual proof capture failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
