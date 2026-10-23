import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/pricelist");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/dabe506d-7206-4743-add1-d4459c985a60");
const PROFILE_DIR = path.join(os.tmpdir(), "dente-pricelist-playwright-cache");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });

async function saveProof(page, fileName) {
	const p1 = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: p1, fullPage: false });
	const p2 = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(p1, p2);

	const stats = fs.statSync(p1);
	console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
	return p1;
}

async function setTheme(page, theme) {
	console.log(`[Theme] Setting theme: ${theme}`);
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await page.waitForTimeout(800);
}

async function main() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
	console.log("Using browser executable:", browserPath);

	const context = await chromium.launchPersistentContext(PROFILE_DIR, {
		headless: true,
		executablePath: browserPath,
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	context.setDefaultTimeout(75000);

	try {
		const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
		page.setDefaultTimeout(75000);

		await page.addInitScript(() => {
			const OriginalWebSocket = window.WebSocket;
			window.WebSocket = function (...args) {
				if (args[0] && String(args[0]).includes(":5173")) {
					return {
						addEventListener() {},
						removeEventListener() {},
						send() {},
						close() {},
					};
				}
				return new OriginalWebSocket(...args);
			};
		});

		console.log("[Navigation] Loading page with ?pricelist=1...");
		await page.goto(`${WEB_BASE}/?pricelist=1`, { waitUntil: "commit", timeout: 75000 });

		console.log("[Navigation] Waiting for React mount (boot-state removed)...");
		await page.waitForFunction(() => !document.querySelector("main.boot-state"), null, { timeout: 75000 });
		console.log("[Navigation] React mounted! Waiting for modal container...");

		await page.waitForSelector(".service-pricelist-modal, .pricelist-modal-container", { timeout: 45000 });
		console.log("[Navigation] Modal container ready! Beginning 4-state capture...");
		await page.waitForTimeout(1500);

		// ==========================================
		// 1. PC Light (1440x900)
		// ==========================================
		console.log("\n--- Capturing 01_pricelist_pc_light.png (1440x900 Light) ---");
		await page.setViewportSize({ width: 1440, height: 900 });
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await saveProof(page, "01_pricelist_pc_light.png");

		// ==========================================
		// 2. PC Dark (1440x900)
		// ==========================================
		console.log("\n--- Capturing 02_pricelist_pc_dark.png (1440x900 Dark) ---");
		await page.setViewportSize({ width: 1440, height: 900 });
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await saveProof(page, "02_pricelist_pc_dark.png");

		// ==========================================
		// 3. Mobile Light (390x844)
		// ==========================================
		console.log("\n--- Capturing 03_pricelist_mobile_light.png (390x844 Light) ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(1000);
		await saveProof(page, "03_pricelist_mobile_light.png");

		// ==========================================
		// 4. Mobile Dark (390x844)
		// ==========================================
		console.log("\n--- Capturing 04_pricelist_mobile_dark.png (390x844 Dark) ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "dark");
		await page.waitForTimeout(1000);
		await saveProof(page, "04_pricelist_mobile_dark.png");

		console.log("\n==========================================");
		console.log("ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY!");
		console.log("==========================================");
	} catch (err) {
		console.error("[FATAL] Capture failed:", err);
		process.exit(1);
	} finally {
		await context.close();
	}
}

main().catch(console.error);
