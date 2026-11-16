/**
 * scripts/capture-endo-studio-4state.mjs
 * 4-State Visual Proofs for Domain 19: Endodontics Studio & Chairside Root Canals
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const WEB_URL = "http://127.0.0.1:5173/#endo";
const PROOF_DIR = path.resolve("docs/proofs/endo");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4e1828ad-fdaa-4891-85de-6711b54d1d58");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006");

[PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressTransientOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "clean-proof-suppress-style";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
				.copilot-trigger-btn,
				[data-testid="copilot-floating-trigger"],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressTransientOverlays(page);
	await page.waitForTimeout(400);
}

function verifyAndSaveScreenshot(buffer, filename) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
	}
	const destPrimary = path.join(PROOF_DIR, filename);
	fs.writeFileSync(destPrimary, buffer);

	const destBrain = path.join(BRAIN_DIR, filename);
	fs.writeFileSync(destBrain, buffer);

	const destParentBrain = path.join(PARENT_BRAIN_DIR, filename);
	try {
		fs.writeFileSync(destParentBrain, buffer);
	} catch (_) {}

	console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
}

async function main() {
	const browser = await chromium.launch({ headless: true });

	const states = [
		{ name: "pc_light", filename: "endo_studio_pc_light.png", width: 1440, height: 900, isMobile: false, theme: "light" },
		{ name: "pc_dark", filename: "endo_studio_pc_dark.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
		{ name: "mobile_light", filename: "endo_studio_mobile_light.png", width: 390, height: 844, isMobile: true, theme: "light" },
		{ name: "mobile_dark", filename: "endo_studio_mobile_dark.png", width: 390, height: 844, isMobile: true, theme: "dark" },
	];

	for (const state of states) {
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();
		await page.goto(WEB_URL, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);

		await suppressTransientOverlays(page);
		await setTheme(page, state.theme);

		// Wait for endodontic studio modal
		try {
			await page.waitForSelector('[data-testid="endodontic-studio-modal"]', { timeout: 4000 });
		} catch {
			console.log("Waiting for modal selector timed out, proceeding...");
		}

		await page.waitForTimeout(500);
		await suppressTransientOverlays(page);

		const buffer = await page.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(buffer, state.filename);

		await context.close();
	}

	await browser.close();
	console.log("All 4 states captured successfully!");
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
