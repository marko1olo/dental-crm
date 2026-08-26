/**
 * DENTE DENTAL CRM — WAVE 8 MULTIMODAL VISUAL AUDITOR & 10-THEME SCREENSHOT RUNNER
 *
 * Modules Audited:
 * 1. EndodonticCanalMasterModal (Эндодонтия и апекслокатор)
 * 2. CadCamOcclusionHeatmapModal (CAD/CAM окклюзионный Heatmap)
 * 3. ImplantAbutmentStudioModal (Профиль прорезывания имплантатов)
 * 4. BeforeAfterComparisonView (Фотопротокол и слайдер До/После)
 *
 * Across 10 Canonical Design System Themes:
 * - light, dark, night, calm_teal, contrast, sakura, ocean, emerald, cyber_xray, warm_sand
 *
 * Across 3 Screen Resolutions:
 * - desktop (1440x900)
 * - tablet (768x1024)
 * - mobile (390x844)
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/wave8";
const ARTIFACT_PROOFS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/1a5ba660-570c-47d0-8ffb-283df79c110e/scratch/proofs/wave8";

mkdirSync(PROOFS_DIR, { recursive: true });
mkdirSync(ARTIFACT_PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
	throw new Error("No browser executable found in candidates");
}

const THEMES = [
	"light",
	"dark",
	"night",
	"calm_teal",
	"contrast",
	"sakura",
	"ocean",
	"emerald",
	"cyber_xray",
	"warm_sand",
];

const RESOLUTIONS = [
	{ name: "desktop", width: 1440, height: 900, scale: 1, isMobile: false },
	{ name: "tablet", width: 768, height: 1024, scale: 1, isMobile: false },
	{ name: "mobile", width: 390, height: 844, scale: 2, isMobile: true },
];

const MODULES = [
	{
		key: "endo",
		name: "EndodonticCanalMaster",
		titleRu: "Эндодонтия и электронный апекслокатор",
	},
	{
		key: "cadcam",
		name: "CadCamOcclusionHeatmap",
		titleRu: "CAD/CAM окклюзионный Heatmap",
	},
	{
		key: "implant",
		name: "ImplantAbutmentStudio",
		titleRu: "Студия профиля прорезывания и Абатментов",
	},
	{
		key: "before_after",
		name: "BeforeAfterComparison",
		titleRu: "Фотопротокол — Слайдер До/После и VITA Shade",
	},
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runVisualAudit() {
	console.log("===============================================================================");
	console.log("🚀 STARTING WAVE 8 MULTIMODAL VISUAL AUDIT (10 THEMES x 3 RESOLUTIONS x 4 MODALS)");
	console.log("===============================================================================");
	console.log(`Browser: ${executablePath}`);
	console.log(`Target: ${BASE_URL}/#clinical-modals-studio`);
	console.log(`Output: ${PROOFS_DIR}`);

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	const results = [];
	let totalCaptures = 0;
	let successfulCaptures = 0;

	for (const res of RESOLUTIONS) {
		console.log(`\n📱 VIEWPORT: ${res.name.toUpperCase()} (${res.width}x${res.height} @${res.scale}x)`);

		const context = await browser.newContext({
			viewport: { width: res.width, height: res.height },
			deviceScaleFactor: res.scale,
			isMobile: res.isMobile,
			hasTouch: res.isMobile,
		});

		const page = await context.newPage();

		for (const mod of MODULES) {
			console.log(`\n  🧩 MODULE: ${mod.name} (${mod.titleRu})`);

			for (const theme of THEMES) {
				totalCaptures++;
				const targetUrl = `${BASE_URL}/#clinical-modals-studio?modal=${mod.key}&theme=${theme}`;
				const fileName = `${mod.name}_${theme}_${res.name}.png`;
				const destPath = path.join(PROOFS_DIR, fileName);
				const artifactPath = path.join(ARTIFACT_PROOFS_DIR, fileName);

				try {
					await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 15000 });
					await sleep(400);

					// Force theme attribute and class consistency on <html>
					const isDarkTheme =
						theme === "dark" ||
						theme === "night" ||
						theme === "ocean" ||
						theme === "emerald" ||
						theme === "cyber_xray";

					await page.evaluate(
						({ currentTheme, isDark }) => {
							document.documentElement.setAttribute("data-theme", currentTheme);
							document.documentElement.classList.toggle("dark", isDark);
							document.documentElement.classList.toggle("light", !isDark);
							document.body.className = isDark ? "dark" : "light";
							document.documentElement.style.colorScheme = isDark ? "dark" : "light";
						},
						{ currentTheme: theme, isDark: isDarkTheme },
					);

					await sleep(200);

					// Capture screenshot
					await page.screenshot({ path: destPath, fullPage: false });
					copyFileSync(destPath, artifactPath);

					successfulCaptures++;
					console.log(`    ✅ [${theme}] -> ${fileName}`);

					results.push({
						module: mod.name,
						titleRu: mod.titleRu,
						theme,
						resolution: res.name,
						dimensions: `${res.width}x${res.height}`,
						file: fileName,
						status: "OK",
					});
				} catch (err) {
					console.error(`    ❌ [${theme}] Error: ${err.message}`);
					results.push({
						module: mod.name,
						titleRu: mod.titleRu,
						theme,
						resolution: res.name,
						dimensions: `${res.width}x${res.height}`,
						file: fileName,
						status: "FAILED",
						error: err.message,
					});
				}
			}
		}

		await context.close();
	}

	await browser.close();

	const manifestPath = path.join(PROOFS_DIR, "wave8_multimodal_audit_manifest.json");
	writeFileSync(
		manifestPath,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				totalExpected: totalCaptures,
				totalCaptured: successfulCaptures,
				results,
			},
			null,
			2,
		),
		"utf8",
	);

	console.log("\n===============================================================================");
	console.log(`🎉 WAVE 8 VISUAL AUDIT COMPLETE: ${successfulCaptures}/${totalCaptures} screenshots saved!`);
	console.log(`📁 Manifest saved to: ${manifestPath}`);
	console.log("===============================================================================");
}

runVisualAudit().catch((err) => {
	console.error("FATAL AUDIT ERROR:", err);
	process.exit(1);
});
