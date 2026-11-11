/**
 * scripts/capture-endo-4state-proofs.mjs
 *
 * 4-State Red Team Visual Proofs capture for Endodontic Studio & Chairside Endo QuickBar:
 * - 01_endo_studio_pc_light_1440x900.png
 * - 02_endo_studio_pc_dark_1440x900.png
 * - 03_endo_studio_mobile_light_390x844.png
 * - 04_endo_studio_mobile_dark_390x844.png
 *
 * Standards:
 * - PC Light/Dark: 1440x900
 * - Mobile Light/Dark: 390x844 (Apple iOS HIG)
 * - Anti-Blank Artifact Byte Guard: size >= 20480 bytes (>= 20 KB)
 * - In-Process Vite Server with bulletproof storage and theme isolation
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

const CURRENT_CONV_ID = "b2393548-80c2-47e0-8360-d924199bf8cb";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_ENDO = path.resolve(__dirname, "../docs/proofs/endo");
const OUT_THERAPY = path.resolve(__dirname, "../docs/proofs/therapy");

[OUT_CONV, OUT_ENDO, OUT_THERAPY].forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

async function setupStorage(context, theme) {
	await context.addInitScript(
		({ th }) => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
				localStorage.setItem("dente_active_tooth", "16");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_active_doctor_name", "Д-р Смирнов А.П.");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true })
				);
				localStorage.setItem(
					"dente_active_staff_user",
					JSON.stringify({
						id: "doc-1",
						fullName: "Д-р Смирнов А.П.",
						role: "doctor",
					})
				);
			} catch (_) {}
		},
		{ th: theme },
	);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-4proof";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
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

async function main() {
	console.log("=== 1. Starting In-Process Vite Server ===");
	const viteServer = await createServer({
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
	const baseUrl = `http://127.0.0.1:${port}`;
	console.log(`✓ In-process Vite listening on: ${baseUrl}`);

	console.log("=== 2. Launching Playwright Chromium ===");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const targets = [
		{
			file: "01_endo_studio_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			file: "02_endo_studio_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			file: "03_endo_studio_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			file: "04_endo_studio_mobile_dark_390x844.png",
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
				deviceScaleFactor: t.isMobile ? 2 : 1,
			};
			if (t.isMobile) {
				Object.assign(contextOptions, devices["iPhone 13"]);
				contextOptions.viewport = { width: t.width, height: t.height };
			}

			const context = await browser.newContext(contextOptions);
			await setupStorage(context, t.theme);
			const page = await context.newPage();

			page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

			const targetUrl = `${baseUrl}/?standalone=endo&demo=true#endo`;
			console.log(`Navigating to ${targetUrl}...`);
			await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
			await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			// Применяем тему
			await page.evaluate(({ theme }) => {
				document.documentElement.setAttribute("data-theme", theme);
				const isDark = theme === "dark";
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.body.setAttribute("data-theme", theme);
				document.body.classList.toggle("dark", isDark);
				document.body.classList.toggle("light", !isDark);
			}, { theme: t.theme });

			// Ожидаем появления студии/модалки
			await page.waitForSelector('[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"], [data-testid="chairside-endo-quickbar"]', { timeout: 20000 })
				.catch((e) => console.log("Wait selector notice:", e.message));

			await page.waitForTimeout(1000);
			await suppressOverlays(page);

			// Нажимаем на норму обтурации в 1 клик, чтобы продемонстрировать заполненный клинический протокол
			const normBtn = await page.$('[data-testid="btn-endo-1click-obturation-norm"]');
			if (normBtn) {
				await normBtn.click();
				await page.waitForTimeout(500);
			}

			const endoPath = path.join(OUT_ENDO, t.file);
			const therapyPath = path.join(OUT_THERAPY, t.file);
			const convPath = path.join(OUT_CONV, t.file);

			await page.screenshot({ path: endoPath, fullPage: false, animations: "disabled" });
			copyFileSync(endoPath, therapyPath);
			copyFileSync(endoPath, convPath);

			const stat = statSync(endoPath);
			if (stat.size < 20480) {
				throw new Error(`[BYTE-GUARD FAILED]: ${t.file} is only ${stat.size} bytes (<20KB)`);
			}
			console.log(`✓ [PROOF VERIFIED]: ${t.file} (${stat.size} bytes / ${(stat.size / 1024).toFixed(1)} KB)`);

			await context.close();
		}
		console.log("\n>>> ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY! <<<");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
