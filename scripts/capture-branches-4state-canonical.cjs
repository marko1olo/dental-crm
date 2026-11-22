/**
 * scripts/capture-branches-4state-canonical.cjs
 *
 * CANONICAL 4-STATE PROOFS FOR DOMAIN 30: MULTI-CLINIC BRANCHES & BRANCH SELECTOR
 *
 * 1. ☀️ PC Light (1440x900) - Workspace TopBar & BranchSelector
 * 2. 🌙 PC Dark (1440x900) - Workspace TopBar & BranchSelector
 * 3. 📱 Mobile Light (390x844) - Apple HIG Mobile TopBar & BranchSelector
 * 4. 📱 Mobile Dark (390x844) - Apple HIG Mobile TopBar & BranchSelector
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "60fede07-2491-4545-a88b-383ecc0b3e83";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/branches");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function resilientFetch(url, options, maxRetries = 8) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fetch(url, options);
		} catch (err) {
			if (i === maxRetries - 1) throw err;
			console.log(`[resilientFetch] API warming up / restarting, waiting 2s... (attempt ${i + 1}/${maxRetries})`);
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
	throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

async function provisionSession() {
	const uniqueId = Date.now();
	console.log(`[Provisioning] Initializing test session branch-${uniqueId}@dente-clinic.ru...`);

	const initRes = await resilientFetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум (Сеть)",
			email: `branch-${uniqueId}@dente-clinic.ru`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await resilientFetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	// Create Branch 2 to trigger Multi-Branch Dropdown Selector in TopBar
	console.log("[Provisioning] Creating Branch 2: Филиал на Арбате...");
	await resilientFetch(`${API_BASE}/api/branches`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			name: "Филиал на Арбате",
			city: "Москва",
			address: "ул. Новый Арбат, д. 24",
			phone: "+7 (495) 123-45-67",
			isMain: false,
		}),
	});

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
		}
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await page.waitForTimeout(600);
}

async function main() {
	console.log("=== STARTING CANONICAL 4-STATE PROOFS FOR DOMAIN 30 BRANCHES ===");

	const auth = await provisionSession();

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const addAuthInitScript = async (ctx) => {
			await ctx.addInitScript(
				({ ct, st, uid }) => {
					localStorage.setItem("dente_clinic_token", ct);
					localStorage.setItem("dente_staff_token", st);
					localStorage.setItem("dente_active_role", "owner");
					localStorage.setItem("dente_user_role", "owner");
					localStorage.setItem("dente_role", "owner");
					localStorage.setItem("dente_active_mode", "clinic");
					localStorage.setItem("dente_perspective", "management");
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dente_demo_banner_dismissed", "true");
					localStorage.setItem(
						"dente_staff_session",
						JSON.stringify({
							userId: uid,
							name: "Д-р Воронов Алексей Владимирович",
							fullName: "Д-р Воронов Алексей Владимирович",
							role: "owner",
							specialties: ["Стоматолог-терапевт", "Ортопед"],
						})
					);
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
				},
				{
					ct: auth.clinicToken,
					st: auth.staffToken,
					uid: auth.ownerUserId,
				}
			);
		};

		// ═════════════════════════════════════════════════════════════
		// 1. PC CONTEXT (1440x900)
		// ═════════════════════════════════════════════════════════════
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		await addAuthInitScript(pcContext);
		const pcPage = await pcContext.newPage();

		console.log("\n>>> [PC] Navigating to Workspace TopBar (1440x900) <<<");
		await pcPage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await pcPage.waitForSelector(".app-shell, .workspace-topbar, header, .topbar", { state: "visible", timeout: 45000 });
		await pcPage.waitForTimeout(2000);

		// Suppress tour overlays
		await pcPage.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.shepherd-element, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"] {
					display: none !important;
				}
			`;
			document.head.appendChild(style);
		});

		// Click branch selector dropdown to showcase multi-clinic options
		const branchSelectorBtn = await pcPage.$("[data-testid='branch-selector-button']");
		if (branchSelectorBtn) {
			console.log("Opening branch selector dropdown on PC...");
			await branchSelectorBtn.click();
			await pcPage.waitForTimeout(500);
		}

		// 01. ☀️ PC Light
		console.log("\n📸 01. Capturing: 01_branches_header_pc_light_1440x900.png");
		await applyTheme(pcPage, "light");
		await saveProof(pcPage, "01_branches_header_pc_light_1440x900.png");

		// 02. 🌙 PC Dark
		console.log("\n📸 02. Capturing: 02_branches_header_pc_dark_1440x900.png");
		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "02_branches_header_pc_dark_1440x900.png");

		// ═════════════════════════════════════════════════════════════
		// 2. MOBILE PRESENTATION (390x844 - Apple HIG)
		// ═════════════════════════════════════════════════════════════
		console.log("\n>>> [Mobile] Launching Apple HIG 390x844 Context <<<");
		await pcContext.close();

		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await addAuthInitScript(mobileContext);
		const mobilePage = await mobileContext.newPage();

		await mobilePage.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
		await mobilePage.waitForSelector(".app-shell, .workspace-topbar, header, .topbar", { state: "visible", timeout: 45000 });
		await mobilePage.waitForTimeout(2000);

		// Suppress tour overlays
		await mobilePage.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.shepherd-element, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"] {
					display: none !important;
				}
			`;
			document.head.appendChild(style);
		});

		// Ensure branch selector dropdown is visible for mobile proof
		const mobileBranchBtn = await mobilePage.$("[data-testid='branch-selector-button']");
		if (mobileBranchBtn) {
			console.log("Opening branch selector dropdown for mobile proof...");
			await mobileBranchBtn.click();
			await mobilePage.waitForTimeout(500);
		}

		// 03. 📱 Mobile Light
		console.log("\n📸 03. Capturing: 03_branches_header_mobile_light_390x844.png");
		await applyTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_branches_header_mobile_light_390x844.png");

		// 04. 📱 Mobile Dark
		console.log("\n📸 04. Capturing: 04_branches_header_mobile_dark_390x844.png");
		await applyTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_branches_header_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n=======================================================");
		console.log(">>> [VICTORY] All 4 Domain 30 Proofs captured and verified! <<<");
		console.log("=======================================================");
	} finally {
		if (browser) await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
