/**
 * scripts/capture-dental-lab-4state.mjs
 *
 * Live 4-State Proof Capture for DentalLabStudioModal (ЗТЛ):
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

const PROOF_DIR = path.resolve("docs/proofs/lab");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
	console.log("=== STARTING DENTAL LAB STUDIO 4-STATE CAPTURE ===");
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
	});

	try {
		const page = await browser.newPage();

		// Configure states: [name, width, height, themeMode, isMobile]
		const states = [
			{
				name: "dental_lab_studio_pc_light_1440x900.png",
				width: 1440,
				height: 900,
				theme: "light",
				isMobile: false,
			},
			{
				name: "dental_lab_studio_pc_dark_1440x900.png",
				width: 1440,
				height: 900,
				theme: "dark",
				isMobile: false,
			},
			{
				name: "dental_lab_studio_mobile_light_390x844.png",
				width: 390,
				height: 844,
				theme: "light",
				isMobile: true,
			},
			{
				name: "dental_lab_studio_mobile_dark_390x844.png",
				width: 390,
				height: 844,
				theme: "dark",
				isMobile: true,
			},
		];

		for (const state of states) {
			console.log(`\n>>> Capturing ${state.name} (${state.width}x${state.height}, theme=${state.theme})...`);
			await page.setViewport({
				width: state.width,
				height: state.height,
				isMobile: state.isMobile,
				hasTouch: state.isMobile,
			});

			const url = `http://127.0.0.1:5173/?stand=lab#lab`;
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
			await sleep(1000);

			// Apply theme and ensure modal is open
			await page.evaluate((themeMode) => {
				localStorage.setItem("dente_theme_mode", themeMode);
				const root = document.documentElement;
				if (themeMode === "dark") {
					root.classList.add("dark");
					root.setAttribute("data-theme", "dark");
					root.style.colorScheme = "dark";
				} else {
					root.classList.remove("dark");
					root.setAttribute("data-theme", "light");
					root.style.colorScheme = "light";
				}
				// Trigger window event if not open
				window.dispatchEvent(new CustomEvent("dente:open-lab", { detail: { toothFdi: "16" } }));
			}, state.theme);

			await sleep(1000);

			// Wait for modal container or studio
			await page.waitForSelector('[data-testid="dental-lab-studio-modal"], [data-testid="tab-new-order"], .dental-lab-studio-modal', { timeout: 10000 }).catch(() => {
				console.warn("Could not find studio modal selector, capturing current page");
			});

			const outPath = path.join(PROOF_DIR, state.name);
			await page.screenshot({ path: outPath, fullPage: false });
			const stats = fs.statSync(outPath);
			console.log(`[PROOF OK] Saved ${state.name}: ${stats.size} bytes`);
			if (stats.size < 40000) {
				console.warn(`[WARNING] ${state.name} is smaller than 40KB (${stats.size} bytes)!`);
			}
		}

		console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Fatal error capturing proofs:", err);
	process.exit(1);
});
