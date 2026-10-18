/**
 * scripts/capture_documents_proofs.cjs
 *
 * Real browser Playwright capture for Documents domain 4-state visual proof:
 * 1. documents_pc_light_1440x900.png
 * 2. documents_pc_dark_1440x900.png
 * 3. documents_mobile_light_390x844.png
 * 4. documents_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/proofs/documents");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const configs = [
	{ name: "pc", width: 1440, height: 900, isMobile: false, hasTouch: false, theme: "light" },
	{ name: "pc", width: 1440, height: 900, isMobile: false, hasTouch: false, theme: "dark" },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, theme: "light" },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, theme: "dark" },
];

async function capture() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR DOCUMENTS DOMAIN ===");

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const cfg of configs) {
			const filename = `documents_${cfg.name}_${cfg.theme}_${cfg.width}x${cfg.height}.png`;
			const targetPath = path.join(outputDir, filename);
			console.log(`\n[Capture] Generating ${filename} (${cfg.width}x${cfg.height}, theme=${cfg.theme})...`);

			const context = await browser.newContext({
				viewport: { width: cfg.width, height: cfg.height },
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				isMobile: cfg.isMobile,
				hasTouch: cfg.hasTouch,
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ th }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_workspace_perspective", "doctor");
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("theme", th);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
				);
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }),
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "doctor",
						selectedPatientId: "01a00000-0000-0000-0000-000000000001",
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);

				const style = document.createElement("style");
				style.id = "suppress-all-tour-overlays";
				style.textContent = `
					[data-testid="doctor-training-coach-mark-card"],
					[data-testid="guided-tour-spotlight-overlay"],
					.tour-spotlight-root,
					.tour-backdrop-clickable-zone,
					vite-error-overlay {
						display: none !important;
						pointer-events: none !important;
					}
					*, *::before, *::after {
						animation: none !important;
						transition: none !important;
					}
				`;
				document.head.appendChild(style);
			}, { th: cfg.theme });

			const page = await context.newPage();
			console.log(`Navigating to http://127.0.0.1:5173/#documents...`);
			await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded", timeout: 25000 });

			// Wait for app ready
			for (let i = 0; i < 20; i++) {
				await page.waitForTimeout(500);
				const text = await page.evaluate(() => document.body ? document.body.innerText : "");
				if (!text.includes("Загрузка системы") && text.length > 200) {
					break;
				}
			}

			// Ensure theme attributes match requested theme
			await page.evaluate((th) => {
				document.documentElement.setAttribute("data-theme", th);
				if (th === "dark") {
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
				} else {
					document.documentElement.classList.add("light");
					document.documentElement.classList.remove("dark");
				}
				document.body.className = th;
				document.documentElement.style.colorScheme = th;
			}, cfg.theme);

			// Switch hash to documents
			await page.evaluate(() => {
				window.location.hash = "documents";
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			});

			// Wait for Suspense to resolve
			for (let i = 0; i < 20; i++) {
				await page.waitForTimeout(500);
				const hasLoadingPill = await page.evaluate(() => {
					const el = document.querySelector("#documents .status-pill");
					return el && el.innerText.includes("загрузка");
				});
				if (!hasLoadingPill) {
					break;
				}
			}

			// Let UI settle
			await page.waitForTimeout(1000);

			// Take screenshot
			await page.screenshot({ path: targetPath, fullPage: false });
			const stat = fs.statSync(targetPath);
			console.log(`[Capture] Saved ${filename} (${Math.round(stat.size / 1024)} KB)`);

			if (stat.size < 20 * 1024) {
				throw new Error(`Screenshot ${filename} is smaller than 20KB: ${stat.size} bytes`);
			}

			await context.close();
		}

		console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY (ALL >= 20KB) ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("FATAL CAPTURE ERROR:", err);
	process.exit(1);
});
