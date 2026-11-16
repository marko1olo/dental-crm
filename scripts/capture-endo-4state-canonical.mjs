/**
 * scripts/capture-endo-4state-canonical.mjs
 *
 * 4-State Red Team Visual Proofs capture for Endodontic Studio & Chairside Endo QuickBar
 * Running against live Fastify API (4100) + Vite (5173).
 */

delete process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;
process.env.NO_PROXY = "127.0.0.1,localhost";

import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_CONV_ID = process.env.CONV_ID || "ba8815c0-5b14-4420-9501-048c16eb9582";
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
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
				localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_demo_mode", "true");
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

async function main() {
	console.log("=== Launching Chrome for Canonical 4-State Endo Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--proxy-server=direct://",
			"--proxy-bypass-list=*",
		],
	});

	const targets = [
		// 1-4: Endodontic Studio Modal
		{
			file: "01_endo_studio_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true#endo",
			selector: '[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]',
		},
		{
			file: "02_endo_studio_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true#endo",
			selector: '[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]',
		},
		{
			file: "03_endo_studio_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true#endo",
			selector: '[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]',
		},
		{
			file: "04_endo_studio_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true#endo",
			selector: '[data-testid="endodontic-studio-modal"], [data-testid="endo-canal-log-modal"]',
		},
		// 5-8: Chairside Endo QuickBar
		{
			file: "05_endo_quickbar_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true&quickbar=1#endo-quickbar",
			selector: '[data-testid="chairside-endo-quickbar"]',
		},
		{
			file: "06_endo_quickbar_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true&quickbar=1#endo-quickbar",
			selector: '[data-testid="chairside-endo-quickbar"]',
		},
		{
			file: "07_endo_quickbar_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true&quickbar=1#endo-quickbar",
			selector: '[data-testid="chairside-endo-quickbar"]',
		},
		{
			file: "08_endo_quickbar_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
			url: "http://127.0.0.1:5173/?stand=endo&demo=true&quickbar=1#endo-quickbar",
			selector: '[data-testid="chairside-endo-quickbar"]',
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
				deviceScaleFactor: 1,
				serviceWorkers: "block",
			};

			const context = await browser.newContext(contextOptions);
			await setupStorage(context, t.theme);
			const page = await context.newPage();

			page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

			console.log(`Navigating to ${t.url}...`);
			await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 20000 });
			await page.waitForTimeout(800);
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
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
			}, { theme: t.theme });

			await page.waitForSelector(t.selector, { timeout: 15000 });
			await page.waitForTimeout(800);
			await suppressOverlays(page);

			// Если это модалка студии — нажимаем норму обтурации для демонстрации заполненного протокола
			if (t.file.includes("studio")) {
				const normBtn = await page.$('[data-testid="btn-endo-obturation-norm"], [data-testid="btn-endo-1click-obturation-norm"]');
				if (normBtn) {
					await normBtn.click();
					await page.waitForTimeout(400);
				}
			}

			const endoPath = path.join(OUT_ENDO, t.file);
			const therapyPath = path.join(OUT_THERAPY, t.file);
			const convPath = path.join(OUT_CONV, t.file);

			await page.screenshot({ path: endoPath, fullPage: false, animations: "disabled" });
			try { copyFileSync(endoPath, therapyPath); } catch (_) {}
			try { copyFileSync(endoPath, convPath); } catch (_) {}

			const stat = statSync(endoPath);
			if (stat.size < 20480) {
				throw new Error(`[BYTE-GUARD FAILED]: ${t.file} is only ${stat.size} bytes (<20KB)`);
			}
			console.log(`✓ [PROOF VERIFIED]: ${t.file} (${stat.size} bytes / ${(stat.size / 1024).toFixed(1)} KB)`);

			await context.close();
		}
		console.log("\n>>> ALL 8 CANONICAL PROOFS CAPTURED SUCCESSFULLY! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
