/**
 * scripts/capture_onboarding_presets_proofs.mjs
 *
 * Captures real visual proof screenshots for:
 * 1. Onboarding Wizard with Sovereign Scale Presets (PC Light & Dark)
 * 2. Deep Clinical Settings Section with Autocalibration & Autonomy (PC Light & Dark)
 * 3. Interactive Guided Tour with Spotlight Overlay (PC Light)
 * 4. Mobile Onboarding Presets (Mobile Light & Dark, 390x844)
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero emojis, WCAG AAA contrast, <2 buttons per card).
 * - Mandate 8e: Doctor Autonomy (Non-blocking, 1-click norm defaults).
 * - Mandate 8s: Universal Best-of-Breed Architecture.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/44206562-f1a5-40c9-afb8-c8fc58f60654";
const API_BASE = "http://127.0.0.1:4100";

async function getActiveAppBase() {
	for (const port of [5174, 5173, 5175]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}`);
			if (res.ok || res.status === 200 || res.status === 304) {
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	return "http://127.0.0.1:5174";
}

function getFileHash(filePath) {
	const buffer = fs.readFileSync(filePath);
	return crypto.createHash("md5").update(buffer).digest("hex");
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => fs.existsSync(p));

async function provisionFreshClinic() {
	const uniqueId = Date.now();
	const email = `onboarding-proof-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic via API: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ (Эталон)",
			email,
			password,
			ownerName: "Д-р Романюк Александр Павлович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup/init failed: HTTP ${initRes.status} - ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
	};
}

async function run() {
	if (!fs.existsSync(ARTIFACT_DIR)) {
		fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
	}

	const appBase = await getActiveAppBase();
	console.log(`[WEB] Active frontend detected at: ${appBase}`);

	const auth = await provisionFreshClinic();
	console.log(`[AUTH] Fresh clinic ready: orgId=${auth.organizationId}`);

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}

	const browser = await chromium.launch(launchOptions);

	// ==========================================
	// 1. DESKTOP LIGHT & DARK: ONBOARDING WIZARD & PRESETS
	// ==========================================
	for (const theme of ["light", "dark"]) {
		console.log(`\n[CAPTURE] Capturing Onboarding Presets in Desktop ${theme.toUpperCase()}...`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: theme,
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ cToken, sToken, thm }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", thm);
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true"); // Prevent tour popup from occluding onboarding
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedSpecialty: "therapist",
						onboardingDismissed: false,
					}),
				);
			},
			{ cToken: auth.clinicToken, sToken: auth.staffToken, thm: theme },
		);

		await page.goto(`${appBase}/#settings/clinic`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(4000);

		// Apply theme class
		await page.evaluate((th) => {
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", th);
		}, theme);

		// Reopen onboarding wizard if not open
		await page.evaluate(() => {
			const reopenBtn = document.querySelector('[data-testid="btn-reopen-onboarding-menuitem"]');
			if (reopenBtn) (/** @type {HTMLElement} */ (reopenBtn)).click();
			else {
				const more = document.querySelector('[data-testid="btn-settings-more-actions"]');
				if (more) {
					(/** @type {HTMLElement} */ (more)).click();
					setTimeout(() => {
						const ro = document.querySelector('[data-testid="btn-reopen-onboarding-menuitem"]');
						if (ro) (/** @type {HTMLElement} */ (ro)).click();
					}, 200);
				}
			}
		});
		await page.waitForTimeout(2000);

		const filename = `onboarding_wizard_presets_pc_${theme}.png`;
		const shotPath = path.join(ARTIFACT_DIR, filename);
		await page.screenshot({ path: shotPath, fullPage: false });
		console.log(`[SAVED] ${shotPath}`);

		await context.close();
	}

	// ==========================================
	// 2. DESKTOP LIGHT & DARK: DEEP CLINICAL SETTINGS
	// ==========================================
	for (const theme of ["light", "dark"]) {
		console.log(`\n[CAPTURE] Capturing Deep Clinical Settings in Desktop ${theme.toUpperCase()}...`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: theme,
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ cToken, sToken, thm }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", thm);
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem(
					"dente_quest_progress_v2",
					JSON.stringify({
						activeTrackId: "solo_doctor",
						currentStepIndex: 0,
						completedStepIds: [],
						isTourActive: false,
						isDismissedPermanently: true,
						tracksProgress: {
							solo_doctor: { completed: true, completedStepIds: [] },
							reception_admin: { completed: true, completedStepIds: [] },
							imaging_diagnostics: { completed: true, completedStepIds: [] },
						},
					}),
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedSpecialty: "therapist",
						onboardingDismissed: true, // Dismiss wizard to expose settings view
					}),
				);
			},
			{ cToken: auth.clinicToken, sToken: auth.staffToken, thm: theme },
		);

		await page.goto(`${appBase}/#settings/deep-clinical`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(3000);

		// Apply theme class and dismiss tour overlay
		await page.evaluate((th) => {
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", th);
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(th);
			}

			const closeTourBtn = document.querySelector('[data-testid="tour-skip-btn"], [data-testid="tour-close-btn"], .tour-dialog-close');
			if (closeTourBtn) (/** @type {HTMLElement} */ (closeTourBtn)).click();
			const coachNever = document.querySelector('[data-testid="coach-mark-never-show-btn"]');
			if (coachNever) (/** @type {HTMLElement} */ (coachNever)).click();
		}, theme);
		await page.waitForTimeout(500);

		// 1. Switch to owner cockpit tab
		await page.evaluate(() => {
			const ownerBtn = document.querySelector('[data-testid="btn-settings-role-owner"]');
			if (ownerBtn) (/** @type {HTMLElement} */ (ownerBtn)).click();
		});
		await page.waitForTimeout(800);

		// 2. Click "Клинические протоколы и автономия" tab
		await page.evaluate(() => {
			const deepTab = document.querySelector('[data-testid="owner-tab-deep-clinical"]');
			if (deepTab) {
				(/** @type {HTMLElement} */ (deepTab)).click();
			} else {
				const tabs = Array.from(document.querySelectorAll("button"));
				const fallback = tabs.find((b) => b.textContent?.includes("Клинические протоколы"));
				if (fallback) fallback.click();
			}
		});
		await page.waitForTimeout(1000);

		// Dismiss any leftover popup safely
		try {
			await page.evaluate(() => {
				const coachNever = document.querySelector('[data-testid="coach-mark-never-show-btn"]');
				if (coachNever) (/** @type {HTMLElement} */ (coachNever)).click();
				const closeTourBtn = document.querySelector('[data-testid="tour-skip-btn"], [data-testid="tour-close-btn"], .tour-dialog-close');
				if (closeTourBtn) (/** @type {HTMLElement} */ (closeTourBtn)).click();
			});
		} catch {}
		await page.waitForTimeout(500);

		await page.waitForSelector('[data-testid="deep-clinical-settings"]', { timeout: 5000 }).catch(() => {});

		const filename = `deep_clinical_settings_pc_${theme}.png`;
		const shotPath = path.join(ARTIFACT_DIR, filename);
		await page.screenshot({ path: shotPath, fullPage: false });
		console.log(`[SAVED] ${shotPath}`);

		await context.close();
	}

	// ==========================================
	// 3. INTERACTIVE GUIDED TOUR SPOTLIGHT (PC Light)
	// ==========================================
	{
		console.log("\n[CAPTURE] Capturing Interactive Guided Tour Spotlight Overlay...");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ cToken, sToken }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dente_workspace_perspective", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "false");
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "doctor",
						selectedSpecialty: "therapist",
						onboardingDismissed: true,
					}),
				);
			},
			{ cToken: auth.clinicToken, sToken: auth.staffToken },
		);

		await page.goto(`${appBase}/#schedule`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(4000);

		// Trigger interactive guide tour for Doctor
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:start-interactive-tour", { detail: { role: "doctor" } }),
			);
		});
		await page.waitForTimeout(1500);

		const filename = "interactive_tour_spotlight_pc_light.png";
		const shotPath = path.join(ARTIFACT_DIR, filename);
		await page.screenshot({ path: shotPath, fullPage: false });
		console.log(`[SAVED] ${shotPath}`);

		await context.close();
	}

	// ==========================================
	// 4. MOBILE ONBOARDING & PRESETS (390x844 Light & Dark)
	// ==========================================
	for (const theme of ["light", "dark"]) {
		console.log(`\n[CAPTURE] Capturing Mobile Onboarding in ${theme.toUpperCase()} (390x844)...`);
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			colorScheme: theme,
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ cToken, sToken, thm }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", thm);
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedSpecialty: "therapist",
						onboardingDismissed: false,
					}),
				);
			},
			{ cToken: auth.clinicToken, sToken: auth.staffToken, thm: theme },
		);

		await page.goto(`${appBase}/#settings/clinic`, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(4000);

		// Apply theme class
		await page.evaluate((th) => {
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", th);
		}, theme);

		// Reopen onboarding wizard if not open
		await page.evaluate(() => {
			const reopenBtn = document.querySelector('[data-testid="btn-reopen-onboarding-menuitem"]');
			if (reopenBtn) (/** @type {HTMLElement} */ (reopenBtn)).click();
			else {
				const more = document.querySelector('[data-testid="btn-settings-more-actions"]');
				if (more) {
					(/** @type {HTMLElement} */ (more)).click();
					setTimeout(() => {
						const ro = document.querySelector('[data-testid="btn-reopen-onboarding-menuitem"]');
						if (ro) (/** @type {HTMLElement} */ (ro)).click();
					}, 200);
				}
			}
		});
		await page.waitForTimeout(2000);

		const filename = `onboarding_presets_mobile_${theme}.png`;
		const shotPath = path.join(ARTIFACT_DIR, filename);
		await page.screenshot({ path: shotPath, fullPage: false });
		console.log(`[SAVED] ${shotPath}`);

		await context.close();
	}

	await browser.close();

	console.log("\n=================== FINAL SCREENSHOT AUDIT ===================");
	const files = [
		"onboarding_wizard_presets_pc_light.png",
		"onboarding_wizard_presets_pc_dark.png",
		"deep_clinical_settings_pc_light.png",
		"deep_clinical_settings_pc_dark.png",
		"interactive_tour_spotlight_pc_light.png",
		"onboarding_presets_mobile_light.png",
		"onboarding_presets_mobile_dark.png",
	];
	const seenHashes = new Set();
	for (const f of files) {
		const full = path.join(ARTIFACT_DIR, f);
		const stat = fs.statSync(full);
		const hash = getFileHash(full);
		const sizeKb = (stat.size / 1024).toFixed(1);
		console.log(`📸 ${f.padEnd(42)} | ${sizeKb.padStart(7)} KB | MD5: ${hash}`);
		if (seenHashes.has(hash)) {
			console.error(`❌ DUPLICATE MD5 DETECTED for ${f}`);
		}
		seenHashes.add(hash);
		if (stat.size < 40 * 1024) {
			console.warn(`⚠️ Warning: file size below 40 KB for ${f}`);
		}
	}
	console.log("==============================================================\n");
}

run().catch((e) => {
	console.error("[FATAL ERROR]", e);
	process.exit(1);
});
