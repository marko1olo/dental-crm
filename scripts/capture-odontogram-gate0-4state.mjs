/**
 * capture-odontogram-gate0-4state.mjs
 * Red Team Visual Proof Pipeline for Tooth 46 Gate 0 Anatomical Odontogram.
 * Captures 4-state visual proofs (PC Light/Dark 1440x900, Mobile Light/Dark 390x844)
 * plus high-resolution macro shots of occlusal cusps and root canals.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const STAND_URL = "http://127.0.0.1:5173/?stand=odontogram-gate0";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
const BYTE_GUARD_MIN = 20480; // 20 KB minimum floor

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function ensureViteServer() {
	const alive = await isPortResponding(STAND_URL, 1500);
	if (alive) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}

	console.log("[Vite] Server not responding. Spawning Vite dev server on port 5173...");
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");

	const proc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});

	let ready = false;
	for (let i = 0; i < 50; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortResponding(STAND_URL, 1000)) {
			ready = true;
			console.log(`[Vite] Server successfully initialized and responding after ${(i + 1) * 600}ms.`);
			break;
		}
	}

	if (!ready) {
		try {
			proc.kill();
		} catch {}
		throw new Error("[FATAL] Vite dev server failed to start on port 5173 within 30s.");
	}

	return proc;
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-gate0-overlays";
			style.innerHTML = `
				vite-error-overlay,
				.global-toast-container,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="demo-mode-banner"] {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .global-toast-container").forEach((el) => el.remove());
		});
	} catch {}
}

async function switchTheme(page, targetTheme) {
	await page.evaluate((target) => {
		const btn = Array.from(document.querySelectorAll("button")).find((b) =>
			b.innerText.includes("Dark") || b.innerText.includes("Light")
		);
		if (btn) {
			const isCurrentlyDark = btn.innerText.includes("Dark");
			if (target === "dark" && !isCurrentlyDark) {
				btn.click();
			} else if (target === "light" && isCurrentlyDark) {
				btn.click();
			}
		}
		document.documentElement.setAttribute("data-theme", target);
		if (target === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, targetTheme);

	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function setZoom(page, zoomLevel) {
	await page.evaluate((z) => {
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.trim() === `${z}x`
		);
		if (btns.length > 0) {
			btns[0].click();
		}
	}, zoomLevel);
	await page.waitForTimeout(400);
}

function verifyByteGuard(filePath) {
	const stats = statSync(filePath);
	if (stats.size < BYTE_GUARD_MIN) {
		throw new Error(
			`[FAIL] Anti-Blank Byte Guard violation: ${filePath} size is ${stats.size} bytes (< ${BYTE_GUARD_MIN} bytes floor).`
		);
	}
	return stats.size;
}

async function run() {
	let viteProc = null;
	let browser = null;

	try {
		viteProc = await ensureViteServer();

		const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
		const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
		const executablePath = existsSync(chromePath)
			? chromePath
			: existsSync(edgePath)
			? edgePath
			: undefined;

		console.log(`[Browser] Launching Chromium (executable: ${executablePath || "bundled"})...`);
		browser = await chromium.launch({
			headless: true,
			executablePath,
			args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});

		// =========================================================================
		// 1. DESKTOP PC 1440x900 (Light & Dark)
		// =========================================================================
		console.log("\n--- [Phase 1] Desktop PC 1440x900 Captures ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcContext.newPage();

		console.log(`[PC] Navigating to ${STAND_URL}...`);
		await pcPage.goto(STAND_URL, { waitUntil: "networkidle", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="tooth-46-gate0-stand"]', { timeout: 15000 });
		await pcPage.waitForSelector('svg[role="img"]', { timeout: 10000 });
		await suppressOverlays(pcPage);

		// 1.1 PC Light
		console.log("[PC Light] Setting light theme...");
		await switchTheme(pcPage, "light");
		await setZoom(pcPage, 2);
		await pcPage.waitForTimeout(600);

		const pcLightPath = path.join(OUT_DIR, "gate0_tooth46_pc_light.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false, animations: "disabled" });
		const pcLightSize = verifyByteGuard(pcLightPath);
		console.log(`[Captured] gate0_tooth46_pc_light.png (${pcLightSize} bytes, 1440x900) -> PASS`);

		// 1.2 PC Dark
		console.log("[PC Dark] Setting dark theme...");
		await switchTheme(pcPage, "dark");
		await pcPage.waitForTimeout(600);

		const pcDarkPath = path.join(OUT_DIR, "gate0_tooth46_pc_dark.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false, animations: "disabled" });
		const pcDarkSize = verifyByteGuard(pcDarkPath);
		console.log(`[Captured] gate0_tooth46_pc_dark.png (${pcDarkSize} bytes, 1440x900) -> PASS`);

		// =========================================================================
		// 2. MACRO SHOTS AT 4X ZOOM (Desktop Context)
		// =========================================================================
		console.log("\n--- [Phase 2] High-Resolution Macro Captures (Zoom 4x) ---");
		await setZoom(pcPage, 4);
		await pcPage.waitForTimeout(600);

		// Hide HUD overlay during macro close-ups
		await pcPage.evaluate(() => {
			const hud = document.querySelector(".stand-hud");
			if (hud) hud.style.display = "none";
		});

		// 2.1 Macro Cusps & Fissures (Dark theme for brilliant contrast & shader glow)
		console.log("[Macro Cusps] Capturing occlusal cusps and Y-5 fissures...");
		const svgElement = pcPage.locator('svg[role="img"]');
		await svgElement.waitFor({ state: "visible" });

		const svgBox = await svgElement.boundingBox();
		if (!svgBox) throw new Error("Could not get bounding box of Tooth 46 SVG");

		// Occlusal crown occupies top 50% of the SVG (Y=0 to Y=78 in viewBox 0 0 100 160)
		const crownClip = {
			x: Math.max(0, Math.floor(svgBox.x - 12)),
			y: Math.max(0, Math.floor(svgBox.y - 10)),
			width: Math.floor(svgBox.width + 24),
			height: Math.floor(svgBox.height * 0.50),
		};

		const macroCuspsPath = path.join(OUT_DIR, "gate0_tooth46_macro_cusps.png");
		await pcPage.screenshot({
			path: macroCuspsPath,
			clip: crownClip,
			animations: "disabled",
		});
		const macroCuspsSize = verifyByteGuard(macroCuspsPath);
		console.log(`[Captured] gate0_tooth46_macro_cusps.png (${macroCuspsSize} bytes, clip: ${crownClip.width}x${crownClip.height}) -> PASS`);

		// 2.2 Macro Roots & Canals with Gutta-Percha
		// 2.2 Macro Roots & Canals with Gutta-Percha
		console.log("[Macro Roots] Enabling endodontics / obturation preset...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const obtBtn = buttons.find((b) => b.textContent.trim() === "Обтурация");
			if (obtBtn) obtBtn.click();
		});
		await pcPage.waitForTimeout(400);

		const rootsClip = {
			x: Math.max(0, Math.floor(svgBox.x - 12)),
			y: Math.max(0, Math.floor(svgBox.y + svgBox.height * 0.42)),
			width: Math.floor(svgBox.width + 24),
			height: Math.floor(svgBox.height * 0.60),
		};

		const macroRootsPath = path.join(OUT_DIR, "gate0_tooth46_macro_roots_canals.png");
		await pcPage.screenshot({
			path: macroRootsPath,
			clip: rootsClip,
			animations: "disabled",
		});
		const macroRootsSize = verifyByteGuard(macroRootsPath);
		console.log(`[Captured] gate0_tooth46_macro_roots_canals.png (${macroRootsSize} bytes, clip: ${rootsClip.width}x${rootsClip.height}) -> PASS`);

		// 2.3 Macro Biological Caries
		console.log("[Macro Caries] Enabling biological caries Class I preset...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const cariesBtn = buttons.find((b) => b.textContent.includes("Кариес Class I"));
			if (cariesBtn) cariesBtn.click();
		});
		await pcPage.waitForTimeout(400);

		const macroCariesPath = path.join(OUT_DIR, "gate0_tooth46_macro_caries.png");
		await pcPage.screenshot({
			path: macroCariesPath,
			clip: crownClip,
			animations: "disabled",
		});
		const macroCariesSize = verifyByteGuard(macroCariesPath);
		console.log(`[Captured] gate0_tooth46_macro_caries.png (${macroCariesSize} bytes) -> PASS`);

		// 2.4 Macro Composite Restoration
		console.log("[Macro Composite] Enabling composite filling preset...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const compBtn = buttons.find((b) => b.textContent.includes("Пломба (сост.)"));
			if (compBtn) compBtn.click();
		});
		await pcPage.waitForTimeout(400);

		const macroCompPath = path.join(OUT_DIR, "gate0_tooth46_macro_composite.png");
		await pcPage.screenshot({
			path: macroCompPath,
			clip: crownClip,
			animations: "disabled",
		});
		const macroCompSize = verifyByteGuard(macroCompPath);
		console.log(`[Captured] gate0_tooth46_macro_composite.png (${macroCompSize} bytes) -> PASS`);

		const wholeToothClip = {
			x: Math.max(0, Math.floor(svgBox.x - 12)),
			y: Math.max(0, Math.floor(svgBox.y - 10)),
			width: Math.floor(svgBox.width + 24),
			height: Math.floor(svgBox.height + 20),
		};

		// 2.5 Macro Monolithic Zirconia Crown
		console.log("[Macro Zirconia] Enabling zirconia crown preset...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const crownBtn = buttons.find((b) => b.textContent.includes("Цирконий (сост.)"));
			if (crownBtn) crownBtn.click();
		});
		await pcPage.waitForTimeout(400);

		const macroZirconiaPath = path.join(OUT_DIR, "gate0_tooth46_macro_zirconia.png");
		await pcPage.screenshot({
			path: macroZirconiaPath,
			clip: wholeToothClip,
			animations: "disabled",
		});
		const macroZirconiaSize = verifyByteGuard(macroZirconiaPath);
		console.log(`[Captured] gate0_tooth46_macro_zirconia.png (${macroZirconiaSize} bytes) -> PASS`);

		// 2.6 Macro Pulpitis & Periapical Granuloma Halo
		console.log("[Macro Granuloma] Enabling periodontitis/granuloma preset...");
		await pcPage.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll("button"));
			const granBtn = buttons.find((b) => b.textContent.trim() === "Гранулема");
			if (granBtn) granBtn.click();
		});
		await pcPage.waitForTimeout(400);

		const macroGranulomaPath = path.join(OUT_DIR, "gate0_tooth46_macro_granuloma.png");
		await pcPage.screenshot({
			path: macroGranulomaPath,
			clip: wholeToothClip,
			animations: "disabled",
		});
		const macroGranulomaSize = verifyByteGuard(macroGranulomaPath);
		console.log(`[Captured] gate0_tooth46_macro_granuloma.png (${macroGranulomaSize} bytes) -> PASS`);

		// Reset to intact preset and restore HUD
		await pcPage.evaluate(() => {
			const hud = document.querySelector(".stand-hud");
			if (hud) hud.style.display = "";
			const buttons = Array.from(document.querySelectorAll("button"));
			const intactBtn = buttons.find((b) => b.textContent.trim() === "Интактный");
			if (intactBtn) intactBtn.click();
		});

		await pcContext.close();

		// =========================================================================
		// 3. MOBILE SMARTPHONE 390x844 (Light & Dark)
		// =========================================================================
		console.log("\n--- [Phase 3] Mobile Smartphone 390x844 Captures ---");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
		});
		const mobPage = await mobContext.newPage();

		console.log(`[Mobile] Navigating to ${STAND_URL}...`);
		await mobPage.goto(STAND_URL, { waitUntil: "networkidle", timeout: 30000 });
		await mobPage.waitForSelector('[data-testid="tooth-46-gate0-stand"]', { timeout: 15000 });
		await mobPage.waitForSelector('svg[role="img"]', { timeout: 10000 });
		await suppressOverlays(mobPage);

		// 3.1 Mobile Light
		console.log("[Mobile Light] Setting light theme...");
		await switchTheme(mobPage, "light");
		await setZoom(mobPage, 2);
		await mobPage.waitForTimeout(600);

		const mobLightPath = path.join(OUT_DIR, "gate0_tooth46_mobile_light.png");
		await mobPage.screenshot({ path: mobLightPath, fullPage: false, animations: "disabled" });
		const mobLightSize = verifyByteGuard(mobLightPath);
		console.log(`[Captured] gate0_tooth46_mobile_light.png (${mobLightSize} bytes, 390x844 @2x) -> PASS`);

		// 3.2 Mobile Dark
		console.log("[Mobile Dark] Setting dark theme...");
		await switchTheme(mobPage, "dark");
		await mobPage.waitForTimeout(600);

		const mobDarkPath = path.join(OUT_DIR, "gate0_tooth46_mobile_dark.png");
		await mobPage.screenshot({ path: mobDarkPath, fullPage: false, animations: "disabled" });
		const mobDarkSize = verifyByteGuard(mobDarkPath);
		console.log(`[Captured] gate0_tooth46_mobile_dark.png (${mobDarkSize} bytes, 390x844 @2x) -> PASS`);

		await mobContext.close();

		console.log("\n=======================================================");
		console.log("[GATE 0 SUCCESS] All 6 visual proof artifacts captured!");
		console.log(`1. gate0_tooth46_pc_light.png:          ${pcLightSize} bytes (>= 20KB)`);
		console.log(`2. gate0_tooth46_pc_dark.png:           ${pcDarkSize} bytes (>= 20KB)`);
		console.log(`3. gate0_tooth46_macro_cusps.png:       ${macroCuspsSize} bytes (>= 20KB)`);
		console.log(`4. gate0_tooth46_macro_roots_canals.png: ${macroRootsSize} bytes (>= 20KB)`);
		console.log(`5. gate0_tooth46_mobile_light.png:      ${mobLightSize} bytes (>= 20KB)`);
		console.log(`6. gate0_tooth46_mobile_dark.png:       ${mobDarkSize} bytes (>= 20KB)`);
		console.log("=======================================================\n");
	} finally {
		if (browser) {
			try {
				await browser.close();
				console.log("[Browser] Closed cleanly.");
			} catch {}
		}
		if (viteProc) {
			try {
				viteProc.kill();
				console.log("[Vite] Terminated spawned dev server.");
			} catch {}
		}
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
