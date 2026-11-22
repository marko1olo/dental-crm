/**
 * scripts/take_family_wallet_canonical_4state.cjs
 *
 * 4-STATE CANONICAL VISUAL PROOF FOR FAMILY WALLET MODAL
 * 05. ☀️ PC Light (1440x900) - Family Wallet Modal & Balance Allocation
 * 06. 🌙 PC Dark (1440x900) - Family Wallet Modal & Balance Allocation
 * 07. 📱 Mobile Light (390x844) - Mobile Family Wallet Bottom Sheet (Apple HIG)
 * 08. 📱 Mobile Dark (390x844) - Mobile Family Wallet Bottom Sheet (Apple HIG)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CURRENT_CONV_ID = "abfed9ee-d1f8-4fd9-abe9-b493ef7fefeb";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patients");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);

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
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`✅ [VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved to docs & brain.`);
	return pDocs;
}

async function setDomTheme(page, theme) {
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
	await page.waitForTimeout(800);
}

async function main() {
	const baseUrl = "http://127.0.0.1:5173";
	console.log(`\n=== 4-State Proof for Family Wallet: Single Navigation to ${baseUrl}/?demo=true&patient_card=1&tab=finance ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});

		await context.addInitScript(() => {
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
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
		});

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

		console.log("Navigating to patient card...");
		await page.goto(`${baseUrl}/?demo=true&patient_card=1&tab=finance`, { waitUntil: "commit", timeout: 35000 });
		console.log("Waiting for patient-card-modal...");
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "visible", timeout: 25000 });
		console.log("Patient card modal visible!");

		console.log("Clicking family tab...");
		const familyTab = await page.waitForSelector("[data-testid='tab-patient-family']", { state: "visible", timeout: 10000 });
		await familyTab.click();
		await page.waitForTimeout(1000);

		console.log("Clicking widget-open-family-wallet-btn...");
		const openWalletBtn = await page.waitForSelector("[data-testid='widget-open-family-wallet-btn']", { state: "visible", timeout: 10000 });
		await openWalletBtn.click();

		console.log("Waiting for family-wallet-modal...");
		await page.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		await page.waitForTimeout(1000);

		// 05. ☀️ PC Light (1440x900)
		console.log("\n📸 05. Capturing: 05_family_wallet_pc_light_1440x900.png");
		await setDomTheme(page, "light");
		await saveProof(page, "05_family_wallet_pc_light_1440x900.png");

		// 06. 🌙 PC Dark (1440x900)
		console.log("\n📸 06. Capturing: 06_family_wallet_pc_dark_1440x900.png");
		await setDomTheme(page, "dark");
		await saveProof(page, "06_family_wallet_pc_dark_1440x900.png");

		// 07. 📱 Mobile Light (390x844)
		console.log("\n📸 07. Capturing: 07_family_wallet_mobile_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await setDomTheme(page, "light");
		await saveProof(page, "07_family_wallet_mobile_light_390x844.png");

		// 08. 📱 Mobile Dark (390x844)
		console.log("\n📸 08. Capturing: 08_family_wallet_mobile_dark_390x844.png");
		await setDomTheme(page, "dark");
		await saveProof(page, "08_family_wallet_mobile_dark_390x844.png");

		await context.close();

		console.log("\n=======================================================");
		console.log(">>> [VICTORY] All Family Wallet 4-State Proofs captured! <<<");
		console.log("=======================================================");
	} finally {
		if (browser) await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
