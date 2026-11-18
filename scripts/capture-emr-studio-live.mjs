/**
 * scripts/capture-emr-studio-live.mjs
 *
 * Captures 6 live visual proofs for MedicalRecordStudioModal:
 * 1. 01_emr_studio_pc_light_1440x900.png (PC Light Overview/A4)
 * 2. 02_emr_studio_pc_dark_1440x900.png (PC Dark Overview/A4)
 * 3. 03_emr_studio_inline_diaries_pc_dark_1440x900.png (PC Dark Diaries Tab with inline form)
 * 4. 04_emr_studio_inline_diaries_pc_light_1440x900.png (PC Light Diaries Tab with inline form)
 * 5. 05_emr_studio_mobile_light_390x844.png (Mobile Light Bottom Sheet)
 * 6. 06_emr_studio_mobile_dark_390x844.png (Mobile Dark Bottom Sheet)
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e9c36c9c-6b93-4b13-9b96-717c253df522");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveProof(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });

	const brainPath = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(proofPath, brainPath);

	const stat = fs.statSync(proofPath);
	console.log(`[PROOF VERIFIED] ${fileName}: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)`);
	if (stat.size < 20000) {
		throw new Error(`Screenshot ${fileName} is too small: ${stat.size} bytes (< 20 KB)!`);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		try {
			document.documentElement.setAttribute("data-theme", th);
			document.body.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("theme", th);
			window.dispatchEvent(new Event("themechange"));
		} catch (e) {}
	}, theme);
	await page.waitForTimeout(600);
}

async function injectOverrides(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container { display: none !important; }
			`;
			document.head.appendChild(style);
		} catch (e) {}
	});
}

async function main() {
	console.log("=== Launching Chrome with bypass args ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--no-proxy-server",
			"--proxy-bypass-list=<-loopback>",
		],
	});

	try {
		// ==========================================
		// 1. PC Viewport (1440x900)
		// ==========================================
		console.log("\n>>> Capturing PC (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
				localStorage.setItem("dente_staff_token", "demo-staff-token");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
					id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
				}));
			} catch (e) {}
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#medical-card", { waitUntil: "networkidle", timeout: 30000 });
		await pcPage.waitForTimeout(2000);
		await injectOverrides(pcPage);

		// Proof 1: PC Light (Overview Tab)
		console.log("Capturing 01_emr_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_emr_studio_pc_light_1440x900.png");

		// Proof 2: PC Dark (Overview Tab)
		console.log("Capturing 02_emr_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_emr_studio_pc_dark_1440x900.png");

		// Switch to Diaries Tab
		console.log("Switching to Diaries Tab...");
		const diariesTabBtn = pcPage.locator(".emr-studio-tab-btn:has-text('Дневники')");
		await diariesTabBtn.click();
		await pcPage.waitForTimeout(1000);

		// Proof 3: PC Dark (Diaries Tab with Inline Form)
		console.log("Capturing 03_emr_studio_inline_diaries_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "03_emr_studio_inline_diaries_pc_dark_1440x900.png");

		// Proof 4: PC Light (Diaries Tab with Inline Form)
		console.log("Capturing 04_emr_studio_inline_diaries_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "04_emr_studio_inline_diaries_pc_light_1440x900.png");

		await pcContext.close();

		// ==========================================
		// 2. Mobile Viewport (390x844 Apple HIG)
		// ==========================================
		console.log("\n>>> Capturing Mobile (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});

		await mobileContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
				localStorage.setItem("dente_staff_token", "demo-staff-token");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
					id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
				}));
			} catch (e) {}
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#medical-card", { waitUntil: "networkidle", timeout: 30000 });
		await mobilePage.waitForTimeout(2000);
		await injectOverrides(mobilePage);

		// Proof 5: Mobile Light
		console.log("Capturing 05_emr_studio_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "05_emr_studio_mobile_light_390x844.png");

		// Proof 6: Mobile Dark
		console.log("Capturing 06_emr_studio_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "06_emr_studio_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 6 EMR STUDIO PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
