import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "cfe33864-2b4f-4fe4-bfae-3f6faf5ebba5";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/insurance";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

function injectStorage(context, theme = "light") {
	return context.addInitScript(
		({ th }) => {
			try {
				localStorage.setItem("dente_clinic_token", "test-token");
				localStorage.setItem("dente_staff_token", "test-token");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_id", "test-uid");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
			} catch (e) {
				// ignore
			}
		},
		{ th: theme },
	);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
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
}

async function saveProof(page, filename, description) {
	const outPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: outPath, fullPage: false });
	const stat = statSync(outPath);
	if (stat.size < 20000) {
		throw new Error(`[BLANK PROOF] ${filename} size is only ${stat.size} bytes`);
	}
	console.log(`[CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
	copyFileSync(outPath, path.join(OUT_CONV, filename));
}

async function main() {
	console.log("=== STARTING 4-STATE INSURANCE DMS PROOF CAPTURE ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	// 1. DESKTOP BROWSER CONTEXT (1440x900)
	console.log("\n--- Capturing Desktop Proofs (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});
	await injectStorage(pcContext, "light");
	const pcPage = await pcContext.newPage();
	await pcPage.goto(`${WEB_URL}/?demo=true&dms=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
	await pcPage.waitForTimeout(2500);
	await suppressOverlays(pcPage);

	// 01: PC Light
	await saveProof(pcPage, "01_insurance_dms_guarantee_letter_pc_light.png", "☀️ PC Light (1440x900) Гарантийное письмо ДМС");

	// 02: PC Dark (in same page by toggling theme)
	await pcPage.emulateMedia({ colorScheme: "dark" });
	await pcPage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await pcPage.waitForTimeout(1500);
	await saveProof(pcPage, "02_insurance_dms_guarantee_letter_pc_dark.png", "🌙 PC Dark (1440x900) Гарантийное письмо ДМС");
	await pcContext.close();

	// 2. MOBILE BROWSER CONTEXT (390x844)
	console.log("\n--- Capturing Mobile Proofs (390x844) ---");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		colorScheme: "light",
	});
	await injectStorage(mobileContext, "light");
	const mobilePage = await mobileContext.newPage();
	await mobilePage.goto(`${WEB_URL}/?demo=true&dms=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
	await mobilePage.waitForTimeout(2500);
	await suppressOverlays(mobilePage);

	// 03: Mobile Light
	await saveProof(mobilePage, "03_insurance_dms_guarantee_letter_mobile_light.png", "📱 Mobile Light (390x844) Гарантийное письмо ДМС на смартфоне");

	// 04: Mobile Dark (in same mobile page by toggling theme)
	await mobilePage.emulateMedia({ colorScheme: "dark" });
	await mobilePage.evaluate(() => {
		document.documentElement.className = "dark";
		document.documentElement.setAttribute("data-theme", "dark");
		if (document.body) document.body.className = "dark";
	});
	await mobilePage.waitForTimeout(1500);
	await saveProof(mobilePage, "04_insurance_dms_guarantee_letter_mobile_dark.png", "📱 Mobile Dark (390x844) Гарантийное письмо ДМС на смартфоне");
	await mobileContext.close();

	await browser.close();
	console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
