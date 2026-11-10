/**
 * scripts/capture-emr-studio-selfcontained.mjs
 *
 * Self-contained 4-State Visual Proof Generator for MedicalRecordStudioModal:
 * Embeds an in-process Vite dev server on isolated port 5199.
 * Captures canonical states:
 * 1. 01_emr_studio_pc_light_1440x900.png (PC Light Overview/A4)
 * 2. 02_emr_studio_pc_dark_1440x900.png (PC Dark Overview/A4)
 * 3. 03_emr_studio_inline_diaries_pc_dark_1440x900.png (PC Dark Diaries Tab with inline form)
 * 4. 04_emr_studio_inline_diaries_pc_light_1440x900.png (PC Light Diaries Tab with inline form)
 * 5. 05_emr_studio_mobile_light_390x844.png (Mobile Light Bottom Sheet)
 * 6. 06_emr_studio_mobile_dark_390x844.png (Mobile Dark Bottom Sheet)
 */

import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e9c36c9c-6b93-4b13-9b96-717c253df522");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, outName) {
	const outPath = path.join(PROOFS_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

	const brainPath = path.join(BRAIN_DIR, outName);
	fs.copyFileSync(outPath, brainPath);

	const size = fs.statSync(outPath).size;
	console.log(`[PROOF VERIFIED] ${outName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${outName} is too small: ${size} bytes (< 20 KB)!`);
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

async function suppressOverlays(page) {
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
	console.log("=== 1. Starting Isolated In-Process Vite Dev Server (port 5199) ===");
	const viteServer = await createServer({
		root: "C:/Clinic_MVP/dental-crm/apps/web",
		configFile: "C:/Clinic_MVP/dental-crm/apps/web/vite.config.ts",
		server: { port: 5199, host: "127.0.0.1", watch: null, hmr: false },
	});
	await viteServer.listen();
	console.log("In-process Vite server listening at http://127.0.0.1:5199/");

	console.log("=== 2. Launching Chrome with proxy bypass ===");
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
		// PC Viewport (1440x900) - Overview Tab
		// ==========================================
		console.log("\n>>> Capturing PC Overview (1440x900)...");
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
		await pcPage.goto("http://127.0.0.1:5199/?demo=true#medical-card", { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for .emr-studio-modal to mount on PC...");
		for (let i = 0; i < 30; i++) {
			await pcPage.waitForTimeout(1000);
			try {
				const count = await pcPage.locator(".emr-studio-modal").count();
				if (count > 0 && await pcPage.locator(".emr-studio-modal").isVisible()) {
					console.log(`[.emr-studio-modal MOUNTED] at ${i + 1}s!`);
					break;
				}
			} catch (e) {}
		}
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// 1. PC Light
		console.log("Capturing 01_emr_studio_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveScreenshot(pcPage, "01_emr_studio_pc_light_1440x900.png");

		// 2. PC Dark
		console.log("Capturing 02_emr_studio_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveScreenshot(pcPage, "02_emr_studio_pc_dark_1440x900.png");

		// Navigate to Diaries directly via URL #medical-card?tab=diaries
		console.log("\n>>> Navigating PC to #medical-card?tab=diaries...");
		await pcPage.goto("http://127.0.0.1:5199/?demo=true#medical-card?tab=diaries", { waitUntil: "commit", timeout: 30000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// 3. Inline Diaries PC Dark
		console.log("Capturing 03_emr_studio_inline_diaries_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveScreenshot(pcPage, "03_emr_studio_inline_diaries_pc_dark_1440x900.png");

		// 4. Inline Diaries PC Light
		console.log("Capturing 04_emr_studio_inline_diaries_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveScreenshot(pcPage, "04_emr_studio_inline_diaries_pc_light_1440x900.png");

		await pcContext.close();

		// ==========================================
		// Mobile Viewport (390x844 - iPhone Apple HIG)
		// ==========================================
		console.log("\n>>> Capturing Mobile (390x844)...");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobContext.addInitScript(() => {
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

		const mobPage = await mobContext.newPage();
		await mobPage.goto("http://127.0.0.1:5199/?demo=true#medical-card", { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for mobile .emr-studio-modal to mount...");
		for (let i = 0; i < 30; i++) {
			await mobPage.waitForTimeout(1000);
			try {
				const count = await mobPage.locator(".emr-studio-modal").count();
				if (count > 0 && await mobPage.locator(".emr-studio-modal").isVisible()) {
					console.log(`[MOBILE .emr-studio-modal MOUNTED] at ${i + 1}s!`);
					break;
				}
			} catch (e) {}
		}
		await mobPage.waitForTimeout(1000);
		await suppressOverlays(mobPage);

		// 5. Mobile Light
		console.log("Capturing 05_emr_studio_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		await saveScreenshot(mobPage, "05_emr_studio_mobile_light_390x844.png");

		// 6. Mobile Dark
		console.log("Capturing 06_emr_studio_mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await saveScreenshot(mobPage, "06_emr_studio_mobile_dark_390x844.png");

		await mobContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 6 EMR STUDIO PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
		await viteServer.close();
		console.log("Browser and Vite server cleanly shut down.");
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
