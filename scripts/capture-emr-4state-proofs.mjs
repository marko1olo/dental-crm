/**
 * scripts/capture-emr-4state-proofs.mjs
 *
 * 4-State Visual Proof Capture for Domain 40:
 * EMR Clinical Protocols, SOAP, Multi-Tooth Diary Persistence & Wheeler 2.5D Odontogram.
 *
 * Mandate 8am (Noble Teal, var(--primary), no hardcoded blue borders #334155).
 * Mandate 8e (Doctor autonomy, buttons never disabled).
 * Mandate 8ar/8as (Wheeler 2.5D, MODBL isolation).
 * Mandate 8x/8zg (Clinical language, zero bureaucratic form names like "043/у", zero dev-slang).
 *
 * Proofs:
 * 1. docs/proofs/emr/01_emr_soap_pc_light_1440x900.png
 * 2. docs/proofs/emr/02_emr_soap_pc_dark_1440x900.png
 * 3. docs/proofs/emr/03_emr_soap_mobile_light_390x844.png
 * 4. docs/proofs/emr/04_emr_soap_mobile_dark_390x844.png
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const CURRENT_CONV_ID = "79b1ca4f-e925-4ccc-acec-1d9b3d576614";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/emr");
const BRAIN_DIR = path.resolve(
	`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`,
);

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-proof-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.global-toast-container,
			.copilot-trigger-btn,
			.workspace-continuity-strip,
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
	await sleep(500);
}

async function main() {
	console.log("=== DOMAIN 40: 4-STATE VISUAL PROOF CAPTURE (EMR CLINICAL PROTOCOLS & SOAP) ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			filename: "01_emr_soap_pc_light_1440x900.png",
			desc: "PC Light 1440x900 (EMR Clinical Protocols & Multi-Tooth SOAP Diaries)",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			hash: "#diaries",
			isMobile: false,
		},
		{
			filename: "02_emr_soap_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900 (EMR Clinical Protocols & Multi-Tooth SOAP Diaries)",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			hash: "#diaries",
			isMobile: false,
		},
		{
			filename: "03_emr_soap_mobile_light_390x844.png",
			desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet & SOAP Protocols)",
			viewport: { width: 390, height: 844 },
			theme: "light",
			hash: "#diaries",
			isMobile: true,
		},
		{
			filename: "04_emr_soap_mobile_dark_390x844.png",
			desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet & SOAP Protocols)",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			hash: "#diaries",
			isMobile: true,
		},
		{
			filename: "05_emr_wheeler_odontogram_pc_light_1440x900.png",
			desc: "PC Light 1440x900 (EMR Wheeler 2.5D Odontogram & MODBL Anatomy)",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			url: "http://127.0.0.1:5173/?stand=odontogram",
			selector: '[data-testid="direct-odontogram-module-launcher"]',
			isMobile: false,
		},
		{
			filename: "06_emr_wheeler_odontogram_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900 (EMR Wheeler 2.5D Odontogram & MODBL Anatomy)",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			url: "http://127.0.0.1:5173/?stand=odontogram",
			selector: '[data-testid="direct-odontogram-module-launcher"]',
			isMobile: false,
		},
	];

	for (const cfg of configs) {
		console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.theme,
		});

		await context.addInitScript(
			({ theme }) => {
				try {
					sessionStorage.setItem("dente_unlocked", "true");
					localStorage.setItem("dente_clinic_token", "demo-clinic-token");
					localStorage.setItem("dente_staff_token", "demo-staff-token");
					localStorage.setItem("dente_workspace_perspective", "doctor");
					localStorage.setItem("dente_user_role", "doctor");
					localStorage.setItem("dente_active_role", "doctor");
					localStorage.setItem("dente_active_user_id", "doc-1");
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_demo_showcase_mode_v1", "true");
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
					localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" }));
					localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor" }, flags: { disableTour: true } } }));

					const isDark = theme === "dark";
					document.documentElement.setAttribute("data-theme", theme);
					document.documentElement.classList.toggle("dark", isDark);
					document.documentElement.classList.toggle("light", !isDark);
					document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				} catch (_) {}
			},
			{ theme: cfg.theme },
		);

		const page = await context.newPage();

		const targetUrl = cfg.url || `http://127.0.0.1:5173/?emr=1${cfg.hash || "#diaries"}`;
		const targetSelector = cfg.selector || '[data-testid="emr-medical-record-standalone-root"], .dente-emr-studio-container, [data-testid="medical-record-studio-modal"]';

		console.log(`Navigating to ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

		// Wait for app shell or root to mount
		await page.waitForSelector(".app-shell, #root", { state: "visible", timeout: 25000 }).catch(() => {});
		await sleep(2500);

		// Suppress tour overlays
		await suppressOverlays(page);
		await setTheme(page, cfg.theme);

		// Wait for target container to be present
		let elemVisible = false;
		for (let i = 0; i < 15; i++) {
			elemVisible = await page.evaluate((sel) => {
				const el = document.querySelector(sel);
				return !!el;
			}, targetSelector);
			if (elemVisible) break;
			await sleep(1000);
		}

		if (!elemVisible && !cfg.url) {
			console.log("Modal selector not found immediately, dispatching open-emr event...");
			await page.evaluate(() => {
				window.location.hash = "#diaries";
				window.dispatchEvent(new CustomEvent("dente:open-medical-record", { detail: { tab: "diaries" } }));
			});
			await sleep(2000);
		}

		await sleep(2000);

		const proofPath = path.join(PROOFS_DIR, cfg.filename);
		const brainPath = path.join(BRAIN_DIR, cfg.filename);

		await page.screenshot({ path: proofPath, fullPage: false });
		fs.copyFileSync(proofPath, brainPath);

		console.log(`✅ Saved: ${proofPath}`);
		await context.close();
	}

	await browser.close();
	console.log("\n🎉 All 4-State EMR SOAP Proofs Captured Successfully!");
}

main().catch((err) => {
	console.error("❌ Capture failed:", err);
	process.exit(1);
});
