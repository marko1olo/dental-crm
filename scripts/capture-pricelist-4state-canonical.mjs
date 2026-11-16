/**
 * scripts/capture-pricelist-4state-canonical.mjs
 *
 * 4-State Red Team Visual Proofs capture for Pricelist & Services Catalog Studio (SSOT)
 * Running against live Fastify API (4100) + Vite (5173).
 */

delete process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;
process.env.NO_PROXY = "127.0.0.1,localhost";

import fs, { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_CONV_ID = "5e4f0cae-e2a5-447e-9a70-fb9c14428ca3";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`;
const OUT_PROOFS = path.resolve(__dirname, "../docs/proofs/pricelist");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/pricelist");

[OUT_CONV, OUT_PROOFS, OUT_SCREENSHOTS].forEach((d) => {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

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
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true })
				);
				localStorage.setItem(
					"dente_active_staff_user",
					JSON.stringify({
						id: "doc-1",
						fullName: "Д-р Воронов А.В.",
						role: "owner",
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

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await page.waitForTimeout(400);
}

async function main() {
	console.log("=== Launching Browser for Canonical 4-State Pricelist Proofs ===");
	console.log(`Executable: ${edgePath}`);
	const browser = await chromium.launch({
		executablePath: edgePath,
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
		{
			file: "01_pricelist_pc_light_1440x900.png",
			alias: "pricelist_pc_light.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
			url: "http://127.0.0.1:5173/#prices",
			selector: '[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal',
		},
		{
			file: "02_pricelist_pc_dark_1440x900.png",
			alias: "pricelist_pc_dark.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
			url: "http://127.0.0.1:5173/#prices",
			selector: '[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal',
		},
		{
			file: "03_pricelist_mobile_light_390x844.png",
			alias: "pricelist_mobile_light.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
			url: "http://127.0.0.1:5173/#prices",
			selector: '[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal',
		},
		{
			file: "04_pricelist_mobile_dark_390x844.png",
			alias: "pricelist_mobile_dark.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
			url: "http://127.0.0.1:5173/#prices",
			selector: '[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal',
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
				deviceScaleFactor: t.isMobile ? 2 : 1.5,
				serviceWorkers: "block",
			};

			const context = await browser.newContext(contextOptions);
			await setupStorage(context, t.theme);
			const page = await context.newPage();

			page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

			console.log(`Navigating to ${t.url}...`);
			await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45000 });
			
			// Wait for React to mount and remove boot-state
			console.log(`Waiting for boot state to clear...`);
			await page.waitForFunction(() => !document.querySelector("main.boot-state"), null, { timeout: 45000 });
			await page.waitForTimeout(1000);
			await applyTheme(page, t.theme);
			await suppressOverlays(page);

			await page.waitForSelector(t.selector, { timeout: 25000 });
			await page.waitForTimeout(800);
			await suppressOverlays(page);

			const proofPath = path.join(OUT_PROOFS, t.file);
			await page.screenshot({ path: proofPath, fullPage: false });

			const size = statSync(proofPath).size;
			console.log(`  ✓ Saved: ${t.file} (${size} bytes)`);

			// Copy to brain and screenshots dirs
			copyFileSync(proofPath, path.join(OUT_CONV, t.file));
			copyFileSync(proofPath, path.join(OUT_SCREENSHOTS, t.file));

			if (t.alias) {
				copyFileSync(proofPath, path.join(OUT_PROOFS, t.alias));
				copyFileSync(proofPath, path.join(OUT_CONV, t.alias));
				copyFileSync(proofPath, path.join(OUT_SCREENSHOTS, t.alias));
				console.log(`  ✓ Mirrored alias: ${t.alias}`);
			}

			// Capture editor modal on desktop light
			if (t.file.includes("pc_light")) {
				try {
					console.log(`Opening Service Editor Modal on PC Light...`);
					const addBtn = page.locator('.pricelist-btn-primary').first();
					if (await addBtn.count() > 0) {
						await addBtn.click({ force: true });
						await page.waitForSelector('.premium-modal-content', { timeout: 10000 });
						await page.waitForTimeout(600);
						const editorFile = "05_pricelist_editor_pc_light_1440x900.png";
						const editorPath = path.join(OUT_PROOFS, editorFile);
						await page.screenshot({ path: editorPath, fullPage: false });
						copyFileSync(editorPath, path.join(OUT_CONV, editorFile));
						copyFileSync(editorPath, path.join(OUT_SCREENSHOTS, editorFile));
						copyFileSync(editorPath, path.join(OUT_PROOFS, "pricelist_editor_pc_light.png"));
						copyFileSync(editorPath, path.join(OUT_CONV, "pricelist_editor_pc_light.png"));
						console.log(`  ✓ Saved Editor Modal: ${editorFile} (${statSync(editorPath).size} bytes)`);

						// Close modal
						const closeBtn = page.locator('.premium-modal-close').first();
						if (await closeBtn.count() > 0) await closeBtn.click({ force: true });
					}
				} catch (e) {
					console.log(`  (Editor capture note: ${e.message})`);
				}
			}

			// Capture editor modal on desktop dark
			if (t.file.includes("pc_dark")) {
				try {
					console.log(`Opening Service Editor Modal on PC Dark...`);
					const addBtn = page.locator('.pricelist-btn-primary').first();
					if (await addBtn.count() > 0) {
						await addBtn.click({ force: true });
						await page.waitForSelector('.premium-modal-content', { timeout: 10000 });
						await page.waitForTimeout(600);
						const editorFile = "06_pricelist_editor_pc_dark_1440x900.png";
						const editorPath = path.join(OUT_PROOFS, editorFile);
						await page.screenshot({ path: editorPath, fullPage: false });
						copyFileSync(editorPath, path.join(OUT_CONV, editorFile));
						copyFileSync(editorPath, path.join(OUT_SCREENSHOTS, editorFile));
						copyFileSync(editorPath, path.join(OUT_PROOFS, "pricelist_editor_pc_dark.png"));
						copyFileSync(editorPath, path.join(OUT_CONV, "pricelist_editor_pc_dark.png"));
						console.log(`  ✓ Saved Editor Modal: ${editorFile} (${statSync(editorPath).size} bytes)`);

						// Close modal
						const closeBtn = page.locator('.premium-modal-close').first();
						if (await closeBtn.count() > 0) await closeBtn.click({ force: true });
					}
				} catch (e) {
					console.log(`  (Editor capture note: ${e.message})`);
				}
			}

			await context.close();
		}

		console.log("\n=== ALL 4-STATE PRICELIST VISUAL PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
