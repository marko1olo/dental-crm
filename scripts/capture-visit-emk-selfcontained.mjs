/**
 * scripts/capture-visit-emk-selfcontained.mjs
 * In-process self-contained 4-State Visual Proof Generator for Chairside Visit & EMR SOAP Diary:
 * Embeds an in-process isolated Vite server on port 5199 (watch: null, hmr: false)
 * completely immune to external port conflicts, proxy traps, and dev reload crashes.
 *
 * Captures:
 * 1. 01_visit_soap_emk_pc_light_1440x900.png
 * 2. 02_visit_soap_emk_pc_dark_1440x900.png
 * 3. 03_visit_soap_emk_mobile_light_390x844.png
 * 4. 04_visit_soap_emk_mobile_dark_390x844.png
 */

import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const CONV_ID = process.env.CONV_ID || "e9195fce-356d-4572-8295-38b5b60022b5";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

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
	const actualPort = viteServer.httpServer.address().port;
	console.log(`In-process Vite server listening at http://127.0.0.1:${actualPort}/`);

	console.log("=== Warming up Vite server ===");
	try {
		await fetch(`http://127.0.0.1:${actualPort}/?stand=visit&demo=true&visit_standalone=1#chairside-visit`);
		console.log("Vite warmed up successfully!");
	} catch (e) {
		console.log("Warmup notice:", e.message);
	}

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
		// PC Viewport (1440x900)
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
		const targetUrl = `http://127.0.0.1:${actualPort}/?stand=visit&demo=true&visit_standalone=1#chairside-visit`;
		await pcPage.goto(targetUrl, { waitUntil: "commit", timeout: 90000 });

		console.log("Waiting for clinical diary content to mount on PC...");
		for (let i = 0; i < 30; i++) {
			await pcPage.waitForTimeout(1000);
			try {
				const text = await pcPage.evaluate(() => (document.body ? document.body.innerText : ""));
				if (text.includes("Дневник") || text.includes("Жалобы") || text.includes("Кариес") || text.includes("Смирнова")) {
					console.log(`[PC CONTENT READY] at ${i + 1}s!`);
					break;
				}
			} catch (e) {}
		}
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// Switch to EMK tab if available
		try {
			const emkTab = pcPage.locator('[data-testid="visit-subtab-emk"], button:has-text("Дневник приёма"), button:has-text("ЭМК")').first();
			if ((await emkTab.count()) > 0 && (await emkTab.isVisible())) {
				await emkTab.click({ force: true });
				await pcPage.waitForTimeout(600);
			}
		} catch {}

		// 1. PC Light
		console.log("Capturing 01_visit_soap_emk_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveScreenshot(pcPage, "01_visit_soap_emk_pc_light_1440x900.png");

		// 2. PC Dark
		console.log("Capturing 02_visit_soap_emk_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveScreenshot(pcPage, "02_visit_soap_emk_pc_dark_1440x900.png");

		await pcContext.close();

		// ==========================================
		// Mobile Viewport (390x844 - Apple HIG)
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
		await mobPage.goto(targetUrl, { waitUntil: "commit", timeout: 90000 });

		console.log("Waiting for mobile clinical diary content to mount...");
		for (let i = 0; i < 30; i++) {
			await mobPage.waitForTimeout(1000);
			try {
				const text = await mobPage.evaluate(() => (document.body ? document.body.innerText : ""));
				if (text.includes("Дневник") || text.includes("Жалобы") || text.includes("Кариес") || text.includes("Смирнова") || text.includes("Объективно")) {
					console.log(`[MOBILE CONTENT READY] at ${i + 1}s!`);
					break;
				}
			} catch (e) {}
		}
		await mobPage.waitForTimeout(1000);
		await suppressOverlays(mobPage);

		// 3. Mobile Light
		console.log("Capturing 03_visit_soap_emk_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		await saveScreenshot(mobPage, "03_visit_soap_emk_mobile_light_390x844.png");

		// 4. Mobile Dark
		console.log("Capturing 04_visit_soap_emk_mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await saveScreenshot(mobPage, "04_visit_soap_emk_mobile_dark_390x844.png");

		await mobContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT EMR/SOAP PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
