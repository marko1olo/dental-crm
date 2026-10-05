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

async function run() {
	console.log("== Starting Dental Chart Inquisition Probe ==");
	
	// 1. Authenticate with real API
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" })
	});
	const loginData = await loginRes.json();
	console.log("API Login OK. Clinic:", loginData.clinicToken ? "YES" : "NO", "Staff:", loginData.staffToken ? "YES" : "NO");

	// 2. Launch browser
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 }
	});

	await context.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_role", "admin");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dental_workspace_onboarding_completed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_tour_completed", "true");
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
	}, { clinicToken: loginData.clinicToken, staffToken: loginData.staffToken, user: loginData.user });

	const page = await context.newPage();
	await page.goto(`${BASE_URL}/#patients`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await page.waitForTimeout(2000);

	console.log("Page URL:", page.url());

	// Find the patient row
	const patientRow = await page.waitForSelector('[data-testid^="patient-row-"]', { timeout: 10000 });
	console.log("Patient row found!");
	await patientRow.click();
	await page.waitForTimeout(1000);

	// Check if open patient card modal button or formula tab exists
	const openCardBtn = await page.$('[data-testid="open-patient-card-modal-btn"]');
	console.log("open-patient-card-modal-btn present?", !!openCardBtn);
	if (openCardBtn) {
		console.log("Opening patient card modal...");
		await openCardBtn.click();
		await page.waitForTimeout(1000);

		const formulaTab = await page.waitForSelector('[data-testid="tab-segment-formula"]', { timeout: 5000 }).catch(() => null);
		console.log("tab-segment-formula found?", !!formulaTab);
		if (formulaTab) {
			await formulaTab.click();
			await page.waitForTimeout(1000);
			console.log("Opened PatientDentalFormulaTab!");
			await page.screenshot({ path: path.join(PROOFS_DIR, "patient_formula_tab_active.png") });
			console.log("Saved patient_formula_tab_active.png");
		}
	}

	// Also check patient-card-open-visit-btn
	const openVisitBtn = await page.$('[data-testid="patient-card-open-visit-btn"]');
	console.log("openVisitBtn present?", !!openVisitBtn);
	if (openVisitBtn) {
		console.log("Navigating to visit...");
		await openVisitBtn.click();
		await page.waitForTimeout(2000);
		console.log("Visit view URL:", page.url());

		const odontogramTab = await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 5000 }).catch(() => null);
		console.log("visit-subtab-odontogram found?", !!odontogramTab);
		if (odontogramTab) {
			await odontogramTab.click();
			await page.waitForTimeout(1500);
			console.log("Switched to visit odontogram tab!");
			await page.screenshot({ path: path.join(PROOFS_DIR, "visit_odontogram_active.png") });
			console.log("Saved visit_odontogram_active.png");
		}
	}

	await browser.close();
}

run().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
