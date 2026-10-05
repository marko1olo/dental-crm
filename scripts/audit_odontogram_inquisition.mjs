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
	console.log("== Auditing Odontogram Navigation ==");
	
	// 1. Authenticate with real API
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" })
	});
	const loginData = await loginRes.json();
	console.log("Logged in:", loginData.user?.fullName);

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
	}, { clinicToken: loginData.clinicToken, staffToken: loginData.staffToken, user: loginData.user });

	const page = await context.newPage();
	await page.goto(`${BASE_URL}/#patients`, { waitUntil: "domcontentloaded", timeout: 15000 });
	await page.waitForTimeout(2000);

	// Find the patient row
	const patientRow = await page.waitForSelector('[data-testid^="patient-row-"]', { timeout: 10000 });
	console.log("Patient row found!");
	await patientRow.click();
	await page.waitForTimeout(1000);

	// Check if right pane or details loaded
	const openVisitBtn = await page.$('[data-testid="patient-card-open-visit-btn"]');
	console.log("Open visit button present?", !!openVisitBtn);
	
	const moreActionsBtn = await page.$('[data-testid="patient-card-more-actions-btn"]');
	console.log("More actions button present?", !!moreActionsBtn);

	// Let's click open visit button if available
	if (openVisitBtn) {
		console.log("Clicking open visit...");
		await openVisitBtn.click();
		await page.waitForTimeout(2000);
		console.log("New URL:", page.url());

		// In VisitView, find the odontogram tab
		const odontogramTab = await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 8000 }).catch(() => null);
		console.log("Odontogram tab found?", !!odontogramTab);
		if (odontogramTab) {
			await odontogramTab.click();
			await page.waitForTimeout(1500);
			console.log("Switched to Odontogram tab!");
			await page.screenshot({ path: path.join(PROOFS_DIR, "visit_odontogram_active.png") });
			console.log("Saved visit_odontogram_active.png");
		}
	}

	await browser.close();
}

run().catch((err) => {
	console.error("ERROR:", err);
	process.exit(1);
});
