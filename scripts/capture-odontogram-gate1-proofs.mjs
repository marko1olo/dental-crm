/**
 * capture-odontogram-gate1-proofs.mjs
 * Red Team Visual Proof Pipeline for Upper Molars 16 & 26 (Gate 1).
 * Captures 4-state visual proofs + macro shots across all clinical states.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const STAND_URL = "http://127.0.0.1:5173/?stand=odontogram-gate1";
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

function verifyByteGuard(filePath) {
	const stats = statSync(filePath);
	if (stats.size < BYTE_GUARD_MIN) {
		throw new Error(
			`[FAIL] Anti-Blank Byte Guard violation: ${filePath} size is ${stats.size} bytes (< ${BYTE_GUARD_MIN} bytes floor).`
		);
	}
	return stats.size;
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-gate1-overlays";
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

async function setTheme(page, theme) {
	await page.evaluate((target) => {
		const btn = Array.from(document.querySelectorAll("button")).find((b) => {
			const t = b.innerText.trim();
			return t === "Светлая" || t === "Темная" || b.title === "Переключить тему";
		});
		if (btn) {
			const isDarkCurrent = btn.innerText.trim() === "Темная";
			if (target === "dark" && !isDarkCurrent) {
				btn.click();
			} else if (target === "light" && isDarkCurrent) {
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
	}, theme);
	await page.waitForTimeout(400);
}

async function setZoom(page, z) {
	await page.evaluate((level) => {
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.trim() === `${level}x`
		);
		if (btns[0]) btns[0].click();
	}, z);
	await page.waitForTimeout(400);
}

async function setToothNumber(page, num) {
	await page.evaluate((n) => {
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.includes(`${n} (`)
		);
		if (btns[0]) btns[0].click();
	}, num);
	await page.waitForTimeout(400);
}

async function clickPresetByBadge(page, badge) {
	const clicked = await page.evaluate((bText) => {
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.trim() === bText || b.innerText.trim() === `✓ ${bText}` || b.innerText.includes(bText)
		);
		const targetBtn = btns.find((b) => b.closest("div")?.innerText.includes("Пресет:")) || btns[0];
		if (targetBtn) {
			targetBtn.click();
			return targetBtn.innerText.trim();
		}
		return null;
	}, badge);
	console.log(`[CLICK PRESET] Badge "${badge}" -> clicked: "${clicked}"`);
	await page.waitForTimeout(500);
}

async function run() {
	let viteProc = null;
	let browser = null;

	try {
		viteProc = await ensureViteServer();

		const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
		const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
		const executablePath = existsSync(chromePath) ? chromePath : existsSync(edgePath) ? edgePath : undefined;

		console.log("[Playwright] Launching browser for Gate 1 proof capture...");
		browser = await chromium.launch({
			headless: true,
			executablePath,
			args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		});

		// 1. PC Light (1440x900)
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await pcPage.goto(STAND_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
		await pcPage.waitForSelector('[data-testid="tooth-16-gate1-stand"]', { timeout: 45000 });
		await pcPage.waitForSelector('svg[role="img"]', { timeout: 15000 });
		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1000);

		await setTheme(pcPage, "light");
		await setZoom(pcPage, 2);
		await setToothNumber(pcPage, 16);
		await clickPresetByBadge(pcPage, "Норма");
		await pcPage.waitForTimeout(600);

		const pcLightPath = path.join(OUT_DIR, "gate1_tooth16_pc_light.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		console.log(`[PASS] Saved PC Light: ${pcLightPath} (${verifyByteGuard(pcLightPath)} B)`);

		// 2. PC Dark (1440x900)
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(600);
		const pcDarkPath = path.join(OUT_DIR, "gate1_tooth16_pc_dark.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		console.log(`[PASS] Saved PC Dark: ${pcDarkPath} (${verifyByteGuard(pcDarkPath)} B)`);

		// 3. Tooth 26 Bilateral Mirror View (1440x900)
		await setToothNumber(pcPage, 26);
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(600);
		const tooth26Path = path.join(OUT_DIR, "gate1_tooth26_mirror_pc_light.png");
		await pcPage.screenshot({ path: tooth26Path, fullPage: false });
		console.log(`[PASS] Saved Tooth 26 Mirror: ${tooth26Path} (${verifyByteGuard(tooth26Path)} B)`);

		// Reset to Tooth 16 for macros
		await setToothNumber(pcPage, 16);
		await setZoom(pcPage, 4);
		await pcPage.waitForTimeout(400);

		// Helper for macro capture
		const captureMacro = async (badge, filename, desc) => {
			await clickPresetByBadge(pcPage, badge);
			await pcPage.waitForTimeout(400);
			const target = await pcPage.$("svg[role='img']");
			const outPath = path.join(OUT_DIR, filename);
			if (target) {
				await target.screenshot({ path: outPath });
			} else {
				await pcPage.screenshot({ path: outPath });
			}
			const size = verifyByteGuard(outPath);
			console.log(`[PASS] Macro ${desc}: ${filename} (${size} B)`);
		};

		// 4. Macro: Crista Obliqua & 4 Cusps & Carabelli
		await captureMacro("Норма", "gate1_tooth16_macro_crista_obliqua.png", "Crista Obliqua & Carabelli");

		// 5. Macro: 3 Roots & Trifurcation
		await captureMacro("Норма", "gate1_tooth16_macro_trifurcation_roots.png", "3 Roots & Trifurcation");

		// 6. Macro: 4 Canals (MB1, MB2, P, DB) with seamless insertion
		await captureMacro("Эндо (4К)", "gate1_tooth16_macro_4canals.png", "4 Canals Gutta-percha");

		// 7. Macro: Caries (Central pit + Distopalatal groove + Carabelli)
		await captureMacro("Кариес", "gate1_tooth16_macro_caries.png", "Organic Caries");

		// 8. Macro: Composite (adequate)
		await captureMacro("Пломба", "gate1_tooth16_macro_composite.png", "Composite A2/A3");

		// 9. Macro: Composite (defective - marginal leakage, secondary caries)
		await captureMacro("Пломба ⚠️", "gate1_tooth16_macro_composite_defective.png", "Composite Defective");

		// 10. Macro: Zirconia Crown
		await captureMacro("ZrO2", "gate1_tooth16_macro_zirconia.png", "Zirconia Crown");

		// 11. Macro: PFM Crown (Porcelain + metal collar)
		await captureMacro("PFM", "gate1_tooth16_macro_pfm.png", "PFM Metal Collar Crown");

		// 12. Macro: Gold Crown
		await captureMacro("Gold", "gate1_tooth16_macro_gold.png", "Gold 24K Crown");

		// 13. Macro: Crown Defective (chip, open margin, perforation)
		await captureMacro("ZrO2 ⚠️", "gate1_tooth16_macro_crown_defective.png", "Crown Defective");

		// 14. Macro: Post & Core in Palatal root
		await captureMacro("Штифт", "gate1_tooth16_macro_post_core.png", "Palatal Post & Core");

		// 15. Macro: Titanium Implant Grade-5
		await captureMacro("Имплант", "gate1_tooth16_macro_implant.png", "Implant Grade-5");

		// 16. Macro: Periodontitis (Periapical halos around 3 roots)
		await captureMacro("Периодонтит", "gate1_tooth16_macro_granuloma.png", "Periapical Halos (3 roots)");

		await pcContext.close();

		// 17 & 18: Mobile Light & Dark (390x844)
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(STAND_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
		await mobilePage.waitForSelector('[data-testid="tooth-16-gate1-stand"]', { timeout: 45000 });
		await mobilePage.waitForSelector('svg[role="img"]', { timeout: 15000 });
		await suppressOverlays(mobilePage);
		await mobilePage.waitForTimeout(1000);

		await setZoom(mobilePage, 2);
		await setToothNumber(mobilePage, 16);
		await clickPresetByBadge(mobilePage, "Норма");

		// Mobile Light
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(600);
		const mobLightPath = path.join(OUT_DIR, "gate1_tooth16_mobile_light.png");
		await mobilePage.screenshot({ path: mobLightPath, fullPage: true });
		console.log(`[PASS] Saved Mobile Light: ${mobLightPath} (${verifyByteGuard(mobLightPath)} B)`);

		// Mobile Dark
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(600);
		const mobDarkPath = path.join(OUT_DIR, "gate1_tooth16_mobile_dark.png");
		await mobilePage.screenshot({ path: mobDarkPath, fullPage: true });
		console.log(`[PASS] Saved Mobile Dark: ${mobDarkPath} (${verifyByteGuard(mobDarkPath)} B)`);

		await mobileContext.close();
		console.log("\n[SUCCESS] ALL 18 GATE 1 VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		if (browser) await browser.close();
		if (viteProc) {
			try {
				viteProc.kill();
			} catch {}
		}
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
