/**
 * scripts/capture-pricelist-4state.mjs
 *
 * 4-State Red Team Visual Proof capture engine for DENTE Dental CRM Pricelist Studio (Mandates 8d, 8al, 8am, 8aw).
 * Captures live React 19 UI in:
 * 1. 01_pricelist_pc_light_1440x900.png (1440x900 Light)
 * 2. 02_pricelist_pc_dark_1440x900.png (1440x900 Dark)
 * 3. 03_pricelist_mobile_light_390x844.png (390x844 Mobile Light, Apple HIG Bottom Sheet)
 * 4. 04_pricelist_mobile_dark_390x844.png (390x844 Mobile Dark, Apple HIG Bottom Sheet)
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVERSATION_ID = process.env.CONVERSATION_ID || "36d056c5-4ff6-47d8-8a68-67fefb3a5f33";
const DOCS_DIR = path.resolve(__dirname, "../docs/proofs/pricelist");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONVERSATION_ID}`);

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function isPortOpen(port = 5173) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		socket.setTimeout(1000);
		socket.on("connect", () => {
			socket.destroy();
			resolve(true);
		});
		socket.on("timeout", () => {
			socket.destroy();
			resolve(false);
		});
		socket.on("error", () => {
			socket.destroy();
			resolve(false);
		});
		socket.connect(port, "127.0.0.1");
	});
}

async function ensureViteServer() {
	if (await isPortOpen(5173)) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}
	console.log("[Vite] Spawning Vite dev server on port 5173...");
	const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
	const webDir = path.resolve(__dirname, "../apps/web");
	const proc = spawn(process.execPath, ["--max-old-space-size=2048", viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});

	for (let i = 0; i < 40; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortOpen(5173)) {
			console.log(`[Vite] Server ready in ${(i + 1) * 600}ms!`);
			return proc;
		}
	}
	try { proc.kill(); } catch {}
	throw new Error("Vite dev server failed to start on port 5173");
}

async function setTheme(page, theme) {
	try {
		await page.evaluate((t) => {
			const root = document.documentElement;
			root.setAttribute("data-theme", t);
			document.body.setAttribute("data-theme", t);
			if (t === "dark") {
				root.classList.add("dark");
				root.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
			} else {
				root.classList.remove("dark");
				root.classList.add("light");
				document.body.classList.remove("dark");
				document.body.classList.add("light");
			}
			localStorage.setItem("dente_theme_mode", t);
			document.documentElement.style.colorScheme = t;
		}, theme);
	} catch (e) {
		console.error("Theme toggle error:", e.message);
	}
	await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: docsPath, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(docsPath, brainPath); } catch {}

	const stats = fs.statSync(docsPath);
	console.log(`[PROOF CAPTURED] ${filename} -> size: ${(stats.size / 1024).toFixed(1)} KB`);
	if (stats.size < 20 * 1024) {
		console.warn(`[WARNING] ${filename} size is under 20KB (${stats.size} bytes)!`);
	}
}

async function cleanNoise(page) {
	await page.evaluate(() => {
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid='demo-mode-banner'], .default-clinic-banner, .shepherd-element").forEach((el) => el.remove());
	});
}

async function run() {
	let viteProc = null;
	let browser = null;
	try {
		viteProc = await ensureViteServer();

		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});

		// ─── 1. Desktop Context (1440x900) ───
		console.log("\n>>> Capturing Desktop proofs (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_theme_mode", "light");
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true&pricelist=1#pricelist", { waitUntil: "commit", timeout: 20000 });
		await pcPage.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal', { timeout: 20000 });
		await cleanNoise(pcPage);

		// 1.1 PC Light
		console.log("Capturing 01_pricelist_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await cleanNoise(pcPage);
		await saveProof(pcPage, "01_pricelist_pc_light_1440x900.png");

		// 1.2 PC Dark
		console.log("Capturing 02_pricelist_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await cleanNoise(pcPage);
		await saveProof(pcPage, "02_pricelist_pc_dark_1440x900.png");

		await pcContext.close();

		// ─── 2. Mobile Context (390x844 iPhone 14/15 HIG) ───
		console.log("\n>>> Capturing Mobile proofs (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_theme_mode", "light");
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true&pricelist=1#pricelist", { waitUntil: "commit", timeout: 20000 });
		await mobilePage.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal', { timeout: 20000 });
		await cleanNoise(mobilePage);

		// 2.1 Mobile Light
		console.log("Capturing 03_pricelist_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await cleanNoise(mobilePage);
		await saveProof(mobilePage, "03_pricelist_mobile_light_390x844.png");

		// 2.2 Mobile Dark
		console.log("Capturing 04_pricelist_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await cleanNoise(mobilePage);
		await saveProof(mobilePage, "04_pricelist_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n[SUCCESS] All 4 visual proofs captured successfully!");
	} catch (err) {
		console.error("[FATAL ERROR]", err);
		process.exitCode = 1;
	} finally {
		if (browser) {
			try { await browser.close(); } catch {}
		}
	}
}

run();
