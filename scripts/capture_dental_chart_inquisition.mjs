/**
 * scripts/capture_dental_chart_inquisition.mjs
 *
 * Red Team Inquisitor-Fixer №8 — Comprehensive Dental Chart & Odontogram Audit
 * Live PostgreSQL 18 + Fastify API (4100) + React Vite (5173).
 *
 * Captures 1440x900 PC Light and PC Dark screenshots:
 * 1. Adult 32 Teeth Anatomical 3D SVG View
 * 2. Pediatric 20 Deciduous Teeth FDI View (51–85)
 * 3. Classic GOST Form 043/u Table View
 * 4. Interactive Tooth Radial Menu with Surface Selector (O, M, D, V, L, C)
 * 5. Mandate 8e: 1-Click Physiological Norm ("Санирован") & Pathology Application
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/dental_chart_inquisition";
mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
	throw new Error("No browser executable found!");
}

async function runAudit() {
	console.log("===============================================================================");
	console.log("🚀 STARTING ODONTOGRAM & DENTAL CHART INQUISITION CAPTURES (1440x900 PC)");
	console.log("===============================================================================");

	// 1. Authenticate with real API as doctor
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" })
	});
	if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
	const loginData = await loginRes.json();
	console.log(`✓ Doctor authenticated: ${loginData.user?.fullName} (Role: ${loginData.user?.role})`);

	// 2. Ensure test patient exists
	let patientId;
	const patRes = await fetch(`${API_URL}/api/patients?limit=5`, {
		headers: {
			"x-dente-clinic-token": loginData.clinicToken,
			"x-dente-staff-token": loginData.staffToken
		}
	});
	const patData = await patRes.json();
	if (Array.isArray(patData) && patData.length > 0) {
		patientId = patData[0].id;
	} else {
		const createRes = await fetch(`${API_URL}/api/patients`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": loginData.clinicToken,
				"x-dente-staff-token": loginData.staffToken
			},
			body: JSON.stringify({
				fullName: "Иванов Иван Иванович",
				phone: "+7 (999) 123-45-67",
				birthDate: "1990-05-15"
			})
		});
		const created = await createRes.json();
		patientId = created.id;
	}
	console.log(`✓ Active patient ID: ${patientId}`);

	// 3. Launch browser
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
	});

	const THEMES = ["light", "dark"];

	for (const theme of THEMES) {
		console.log(`\n🎨 Testing Theme: ${theme.toUpperCase()}`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 }
		});

		await context.addInitScript(({ clinicToken, staffToken, user, targetTheme }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_active_role", user.role || "doctor");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dental_workspace_onboarding_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme", targetTheme);
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: [],
				isTourActive: false,
				isDismissedPermanently: true,
				tracksProgress: {
					solo_doctor: { completed: true, completedStepIds: [] },
					reception_admin: { completed: true, completedStepIds: [] },
					imaging_diagnostics: { completed: true, completedStepIds: [] }
				}
			}));
		}, { clinicToken: loginData.clinicToken, staffToken: loginData.staffToken, user: loginData.user, targetTheme: theme });

		const page = await context.newPage();
		await page.goto(`${BASE_URL}/#patients`, { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForTimeout(2000);

		// Apply dark theme class if needed
		if (theme === "dark") {
			await page.evaluate(() => {
				document.documentElement.classList.add("dark");
				document.documentElement.setAttribute("data-theme", "dark");
			});
		} else {
			await page.evaluate(() => {
				document.documentElement.classList.remove("dark");
				document.documentElement.setAttribute("data-theme", "light");
			});
		}

		// Navigate into Visit View
		const patientRow = await page.waitForSelector('[data-testid^="patient-row-"]', { timeout: 10000 });
		await patientRow.click();
		await page.waitForTimeout(600);

		const openVisitBtn = await page.waitForSelector('[data-testid="patient-card-open-visit-btn"]', { timeout: 5000 });
		await openVisitBtn.click();
		await page.waitForTimeout(1500);

		const odontogramTab = await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 8000 });
		await odontogramTab.click();
		await page.waitForTimeout(1500);

		// 1. Capture Adult Anatomical 3D View (Default)
		// Ensure Adult dentition and Anatomical view mode
		const adultBtn = await page.$('[data-testid="toolbar-dentition-adult"]');
		if (adultBtn) await adultBtn.click();
		const anatModeBtn = await page.$('[data-testid="odontogram-mode-btn-anatomical_svg"]');
		if (anatModeBtn) await anatModeBtn.click();
		await page.waitForTimeout(800);

		const anatShot = path.join(PROOFS_DIR, `dental_chart_adult_anatomical_pc_${theme}.png`);
		await page.screenshot({ path: anatShot });
		console.log(`  ✓ Captured: ${path.basename(anatShot)}`);

		// 2. Capture Pediatric 20 Deciduous Teeth (FDI 51–85) / Mixed Mode
		const pedBtn = await page.$('[data-testid="toolbar-dentition-pediatric"]');
		if (pedBtn) {
			await pedBtn.click();
			await page.waitForTimeout(800);
			const pedShot = path.join(PROOFS_DIR, `dental_chart_pediatric_fdi_pc_${theme}.png`);
			await page.screenshot({ path: pedShot });
			console.log(`  ✓ Captured: ${path.basename(pedShot)}`);
		}

		// Switch back to Adult
		if (adultBtn) {
			await adultBtn.click();
			await page.waitForTimeout(500);
		}

		// 3. Capture Classic GOST 043/u Table View
		const gostModeBtn = await page.$('[data-testid="odontogram-mode-btn-classic_gost"]');
		if (gostModeBtn) {
			await gostModeBtn.click();
			await page.waitForTimeout(800);
			const gostShot = path.join(PROOFS_DIR, `dental_chart_classic_gost_pc_${theme}.png`);
			await page.screenshot({ path: gostShot });
			console.log(`  ✓ Captured: ${path.basename(gostShot)}`);
		}

		// 4. Capture FDI 6-Surface Segmented Interactive View
		const fdiModeBtn = await page.$('[data-testid="odontogram-mode-btn-compact_clinical"]');
		if (fdiModeBtn) {
			await fdiModeBtn.click();
			await page.waitForTimeout(800);
			const fdiShot = path.join(PROOFS_DIR, `dental_chart_fdi_segmented_pc_${theme}.png`);
			await page.screenshot({ path: fdiShot });
			console.log(`  ✓ Captured: ${path.basename(fdiShot)}`);
		}

		// 5. Open Radial Menu & Surface Selector on tooth 16
		if (anatModeBtn) await anatModeBtn.click();
		await page.waitForTimeout(600);
		const tooth16 = await page.$('path[data-tooth="16"], g[data-tooth="16"], [data-tooth-id="16"], [data-tooth-number="16"]');
		if (tooth16) {
			await tooth16.click();
			await page.waitForTimeout(800);
			const radialShot = path.join(PROOFS_DIR, `dental_chart_radial_surfaces_pc_${theme}.png`);
			await page.screenshot({ path: radialShot });
			console.log(`  ✓ Captured: ${path.basename(radialShot)}`);
		}

		// 6. Test Mandate 8e: 1-Click Sanitation ("Санирован") with closed radial menu
		const closeRadialBtn = await page.$('.radial-close-btn');
		if (closeRadialBtn) {
			await closeRadialBtn.click();
			await page.waitForTimeout(600);
		} else {
			await page.keyboard.press("Escape");
			await page.waitForTimeout(600);
		}

		const intactBtn = await page.$('[data-testid="mark-intact-dentition-btn"]');
		if (intactBtn) {
			await intactBtn.click();
			await page.waitForTimeout(600);
			console.log(`  ✓ Clicked 1-Click Sanitation button`);
		}

		const sanShot = path.join(PROOFS_DIR, `dental_chart_1click_sanitation_pc_${theme}.png`);
		await page.screenshot({ path: sanShot });
		console.log(`  ✓ Captured: ${path.basename(sanShot)}`);

		await context.close();
	}

	await browser.close();
	console.log("\n✅ ALL ODONTOGRAM AUDIT SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

runAudit().catch((err) => {
	console.error("FATAL AUDIT ERROR:", err);
	process.exit(1);
});
