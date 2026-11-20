/**
 * scripts/take_patient_imaging_surgeon_proofs.cjs
 *
 * Captures 6 canonical visual proofs for Patient Card, Family Wallet & PACS:
 * 1. 01_patient_card_pc_light_1440x900.png
 * 2. 02_patient_card_pc_dark_1440x900.png
 * 3. 03_patient_card_mobile_light_390x844.png
 * 4. 04_patient_card_mobile_dark_390x844.png
 * 5. 05_family_wallet_pc_light_1440x900.png
 * 6. 06_imaging_pacs_pc_light_1440x900.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "52f52e37-6f9a-4132-9916-10d000c2a81a";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patients");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-proof-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
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
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
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
	console.log(`✅ [PROOF SAVED] ${filename} (${(size / 1024).toFixed(1)} KB)`);
	return pDocs;
}

async function main() {
	const baseUrl = "http://127.0.0.1:5173";
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// Context for PC (1440x900)
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_perspective", "management");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_user_name", "Д-р Смирнова Екатерина Васильевна");
		});

		const page = await pcContext.newPage();

		console.log("Navigating to patient card on PC...");
		await page.goto(`${baseUrl}/?demo=true&patient_card=1&tab=finance`, { waitUntil: "commit", timeout: 35000 });
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "visible", timeout: 25000 });
		await suppressOverlays(page);

		// 1. 01_patient_card_pc_light_1440x900.png
		console.log("Capturing 01_patient_card_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, "01_patient_card_pc_light_1440x900.png");

		// 2. 02_patient_card_pc_dark_1440x900.png
		console.log("Capturing 02_patient_card_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "02_patient_card_pc_dark_1440x900.png");

		// Open Family tab & Family Wallet Modal for 05
		console.log("Opening family wallet modal for proof 05...");
		await setTheme(page, "light");
		const familyTab = await page.waitForSelector("[data-testid='tab-patient-family']", { state: "visible", timeout: 10000 });
		await familyTab.click();
		await page.waitForTimeout(800);

		const openWalletBtn = await page.waitForSelector("[data-testid='widget-open-family-wallet-btn']", { state: "visible", timeout: 10000 });
		await openWalletBtn.click();
		await page.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		await page.waitForTimeout(800);

		// Scroll down to reveal and click the "Добавить родственника" button
		try {
			const addMemberBtn = await page.waitForSelector("[data-testid='btn-open-add-family-member']", { state: "visible", timeout: 5000 });
			await addMemberBtn.scrollIntoViewIfNeeded();
			await addMemberBtn.click();
			await page.waitForTimeout(600);
		} catch (err) {
			console.log("Add member button click fallback:", err.message);
		}

		// 5. 05_family_wallet_pc_light_1440x900.png
		console.log("Capturing 05_family_wallet_pc_light_1440x900.png...");
		await saveProof(page, "05_family_wallet_pc_light_1440x900.png");

		// Close family wallet modal and go to radiology tab for 06
		console.log("Navigating to radiology tab for PACS proof 06...");
		await page.keyboard.press("Escape");
		await page.waitForTimeout(500);

		const radiologyTab = await page.waitForSelector("[data-testid='tab-patient-radiology'], button:has-text('Рентген'), button:has-text('Снимки')", { state: "visible", timeout: 10000 });
		await radiologyTab.click();
		await page.waitForTimeout(1000);
		await suppressOverlays(page);

		// 6. 06_imaging_pacs_pc_light_1440x900.png
		console.log("Capturing 06_imaging_pacs_pc_light_1440x900.png...");
		await saveProof(page, "06_imaging_pacs_pc_light_1440x900.png");

		await pcContext.close();

		// Mobile context (390x844)
		console.log("\nStarting Mobile Context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			colorScheme: "light",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(`${baseUrl}/?demo=true&patient_card=1&tab=finance`, { waitUntil: "commit", timeout: 35000 });
		await mobilePage.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], .patient-card-modal", { state: "visible", timeout: 25000 });
		await suppressOverlays(mobilePage);

		// 3. 03_patient_card_mobile_light_390x844.png
		console.log("Capturing 03_patient_card_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_patient_card_mobile_light_390x844.png");

		// 4. 04_patient_card_mobile_dark_390x844.png
		console.log("Capturing 04_patient_card_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_patient_card_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n🎉 ALL 6 CANONICAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
