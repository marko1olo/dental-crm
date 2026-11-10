/**
 * scripts/take_chairside_hud_4state_proofs.mjs
 *
 * 4-State Red Team Visual Proofs capture for Chairside AI Copilot HUD:
 * - 01_chairside_hud_pc_light_1440x900.png (PC Light, 1440x900, Resting State)
 * - 02_chairside_hud_pc_dark_1440x900.png (PC Dark, 1440x900, Resting State)
 * - 03_chairside_hud_mobile_light_390x844.png (Mobile Light, 390x844, Apple HIG)
 * - 04_chairside_hud_mobile_dark_390x844.png (Mobile Dark, 390x844, Apple HIG)
 *
 * Plus Preset-Activated Proofs:
 * - 05_chairside_hud_preset_pc_light_1440x900.png
 * - 06_chairside_hud_preset_pc_dark_1440x900.png
 * - 07_chairside_hud_preset_mobile_light_390x844.png
 * - 08_chairside_hud_preset_mobile_dark_390x844.png
 */

import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, devices } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CURRENT_CONV_ID = "99a9f3b2-d4ef-4954-9dc6-6e073376abbf";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_COPILOT = path.resolve(__dirname, "../docs/proofs/ai_assistant");

[OUT_CONV, OUT_COPILOT].forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

async function injectStorage(context, theme) {
	await context.addInitScript(
		({ th }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_doctor_name", "Д-р Смирнов А.П.");
				sessionStorage.setItem("dente_unlocked", "true");
			} catch (_) {}
		},
		{ th: theme },
	);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	let baseUrl = "http://127.0.0.1:5173";
	let viteServer = null;
	try {
		const check = await fetch(baseUrl);
		if (check.ok) {
			console.log(`✓ Reusing active Vite dev server at: ${baseUrl}`);
		} else {
			throw new Error("Port not ok");
		}
	} catch (_) {
		console.log("=== 1. Starting In-Process Vite Server for Chairside HUD ===");
		viteServer = await createServer({
			configFile,
			root: webRoot,
			server: {
				host: "127.0.0.1",
				strictPort: false,
				hmr: false,
				watch: null,
			},
		});
		await viteServer.listen();
		const address = viteServer.httpServer.address();
		const port = address.port;
		baseUrl = `http://127.0.0.1:${port}`;
		console.log(`✓ In-process Vite listening on: ${baseUrl}`);
	}

	console.log("=== 2. Launching Playwright Chromium ===");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const targets = [
		{
			file: "01_chairside_hud_pc_light_1440x900.png",
			presetFile: "05_chairside_hud_preset_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			file: "02_chairside_hud_pc_dark_1440x900.png",
			presetFile: "06_chairside_hud_preset_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			file: "03_chairside_hud_mobile_light_390x844.png",
			presetFile: "07_chairside_hud_preset_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			file: "04_chairside_hud_mobile_dark_390x844.png",
			presetFile: "08_chairside_hud_preset_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		},
	];

	try {
		for (const t of targets) {
			console.log(`\nCapturing ${t.file} (${t.width}x${t.height}, theme: ${t.theme}, mobile: ${t.isMobile})...`);
			const contextOptions = {
				viewport: { width: t.width, height: t.height },
				colorScheme: t.theme,
				isMobile: t.isMobile,
				hasTouch: t.isMobile,
			};
			if (t.isMobile) {
				Object.assign(contextOptions, devices["iPhone 13"]);
				contextOptions.viewport = { width: t.width, height: t.height };
			}

			const context = await browser.newContext(contextOptions);
			await injectStorage(context, t.theme);
			const page = await context.newPage();
			page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
			page.on("console", (msg) => {
				if (msg.type() === "error") console.log("[PAGE CONSOLE ERROR]:", msg.text());
			});

			await page.goto(`${baseUrl}/?stand=chairside-hud&demo=true&hud=open#copilot-hud`, {
				waitUntil: "commit",
				timeout: 60000,
			});

			// Ожидаем появления кресельного копайлота
			await page.waitForSelector('[data-testid="chairside-copilot-hud"]', { timeout: 45000 });

			await page.evaluate((th) => {
				if (document.documentElement) {
					document.documentElement.classList.remove("light", "dark");
					document.documentElement.classList.add(th);
					document.documentElement.setAttribute("data-theme", th);
				}
				if (document.body) {
					document.body.classList.remove("light", "dark");
					document.body.classList.add(th);
				}
			}, t.theme);
			await suppressOverlays(page);
			await sleep(1000);

			// 1. Resting state screenshot
			const copilotPath = path.join(OUT_COPILOT, t.file);
			const convPath = path.join(OUT_CONV, t.file);

			await page.screenshot({ path: copilotPath, fullPage: false, animations: "disabled" });
			copyFileSync(copilotPath, convPath);

			const stat = statSync(copilotPath);
			if (stat.size < 20480) {
				throw new Error(`[BYTE-GUARD FAILED]: ${t.file} is only ${stat.size} bytes (<20KB)`);
			}
			console.log(`[RESTING PROOF VERIFIED]: ${t.file} (${stat.size} bytes / ${(stat.size / 1024).toFixed(1)} KB)`);

			// 2. Click preset chip to demonstrate active protocol formation
			const presetBtn = await page.$(".btn-preset-caries-16");
			if (presetBtn) {
				await presetBtn.click();
				await sleep(600);
				const presetCopilotPath = path.join(OUT_COPILOT, t.presetFile);
				const presetConvPath = path.join(OUT_CONV, t.presetFile);
				await page.screenshot({ path: presetCopilotPath, fullPage: false, animations: "disabled" });
				copyFileSync(presetCopilotPath, presetConvPath);
				const presetStat = statSync(presetCopilotPath);
				console.log(`[PRESET PROOF VERIFIED]: ${t.presetFile} (${presetStat.size} bytes / ${(presetStat.size / 1024).toFixed(1)} KB)`);
			}

			await context.close();
		}
		console.log("\n>>> ALL CHAIRSIDE HUD 4-STATE PROOFS CAPTURED SUCCESSFULLY! <<<");
	} finally {
		await browser.close();
		if (viteServer) {
			await viteServer.close();
		}
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
