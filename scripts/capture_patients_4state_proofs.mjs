/**
 * scripts/capture_patients_4state_proofs.mjs
 *
 * 4-state Visual Proof Generator for Patients Domain (Mandate 8e, 8n):
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 * Target folder: docs/proofs/patients/
 */

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const OUTPUT_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\patients";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	console.log("=== CAPTURING 4-STATE PATIENTS PROOF SCREENSHOTS ===");

	// 1. Authenticate with real API
	console.log("Authenticating with API...");
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed with status ${loginRes.status}`);
	}
	const loginData = await loginRes.json();
	console.log("Logged in as:", loginData.user?.fullName);

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => fs.existsSync(p));
	if (!executablePath) {
		throw new Error("Chrome or Edge executable not found");
	}

	console.log(`Using browser: ${executablePath}`);

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	try {
		const page = await browser.newPage();
		page.setDefaultNavigationTimeout(45000);
		page.setDefaultTimeout(45000);

		// Inject real session auth into localStorage
		await page.evaluateOnNewDocument((tokens) => {
			localStorage.setItem("dente_clinic_token", tokens.clinicToken);
			localStorage.setItem("dente_staff_token", tokens.staffToken);
			localStorage.setItem("dente_active_role", "admin");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(tokens.user));
			localStorage.setItem("dental_workspace_onboarding_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_offline_banner_dismissed", "true");
		}, {
			clinicToken: loginData.clinicToken,
			staffToken: loginData.staffToken,
			user: loginData.user,
		});

		// ─── 1. PC DESKTOP (1440x900) ───
		console.log("\n--- STAGE 1: PC DESKTOP (1440x900) ---");
		await page.setViewport({
			width: 1440,
			height: 900,
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		console.log("Navigating to #patients...");
		await page.goto(`${WEB_URL}/#patients`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		console.log("Waiting for patients selector or buttons...");
		await page.waitForSelector('[data-testid^="patient-row-"], button', {
			visible: true,
			timeout: 20000,
		});
		await wait(3000);

		// Click first patient row to display patient workspace header & card
		try {
			const row = await page.$('[data-testid^="patient-row-"]');
			if (row) {
				console.log("Clicking first patient row...");
				await row.click();
				await wait(2000);
			}
		} catch (e) {
			console.log("Patient row selection skipped");
		}

		// 1. PC Light
		console.log("Capturing PC Light...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("dark");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await wait(1500);

		const pcLightPath = path.join(OUTPUT_DIR, "pc_light.png");
		await page.screenshot({ path: pcLightPath, fullPage: false });
		const pcLightSize = fs.statSync(pcLightPath).size;
		console.log(`Saved: ${pcLightPath} (${(pcLightSize / 1024).toFixed(1)} KB)`);

		// 2. PC Dark
		console.log("Capturing PC Dark...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await wait(1500);

		const pcDarkPath = path.join(OUTPUT_DIR, "pc_dark.png");
		await page.screenshot({ path: pcDarkPath, fullPage: false });
		const pcDarkSize = fs.statSync(pcDarkPath).size;
		console.log(`Saved: ${pcDarkPath} (${(pcDarkSize / 1024).toFixed(1)} KB)`);

		// ─── 2. MOBILE (390x844) ───
		console.log("\n--- STAGE 2: MOBILE (390x844) ---");
		const mobilePage = await browser.newPage();
		mobilePage.setDefaultNavigationTimeout(45000);
		mobilePage.setDefaultTimeout(45000);

		await mobilePage.setViewport({
			width: 390,
			height: 844,
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobilePage.evaluateOnNewDocument((tokens) => {
			localStorage.setItem("dente_clinic_token", tokens.clinicToken);
			localStorage.setItem("dente_staff_token", tokens.staffToken);
			localStorage.setItem("dente_active_role", "admin");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(tokens.user));
			localStorage.setItem("dental_workspace_onboarding_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_offline_banner_dismissed", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_theme", "light");
		}, {
			clinicToken: loginData.clinicToken,
			staffToken: loginData.staffToken,
			user: loginData.user,
		});

		console.log("Navigating mobilePage to #patients...");
		await mobilePage.goto(`${WEB_URL}/#patients`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		console.log("Waiting for boot-state to disappear...");
		await mobilePage.waitForFunction(() => !document.querySelector(".boot-state"), {
			timeout: 30000,
		});

		console.log("Waiting for mobile patients container...");
		await mobilePage.waitForSelector(
			'[data-testid="mobile-patients-container"], .mobile-patients-container',
			{
				visible: true,
				timeout: 30000,
			},
		);
		await wait(2500);

		// 3. Mobile Light (List View)
		console.log("Capturing Mobile Light...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("dark");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await wait(1500);

		const mobileLightPath = path.join(OUTPUT_DIR, "mobile_light.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		const mobileLightSize = fs.statSync(mobileLightPath).size;
		console.log(`Saved: ${mobileLightPath} (${(mobileLightSize / 1024).toFixed(1)} KB)`);

		// Click first patient to show mobile patient card workspace in Dark mode
		try {
			console.log("Opening first patient in mobile workspace...");
			const patientItem = await mobilePage.$(
				'.mobile-patient-card, [data-testid^="mobile-patient-item-"], button.mobile-patient-row, .mobile-patients-list button',
			);
			if (patientItem) {
				await patientItem.click();
				await wait(2000);
			}
		} catch (e) {
			console.log("Mobile patient selection click skipped:", e.message);
		}

		// 4. Mobile Dark
		console.log("Capturing Mobile Dark...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await wait(1500);

		const mobileDarkPath = path.join(OUTPUT_DIR, "mobile_dark.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		const mobileDarkSize = fs.statSync(mobileDarkPath).size;
		console.log(`Saved: ${mobileDarkPath} (${(mobileDarkSize / 1024).toFixed(1)} KB)`);

		// Verify size > 20 KB
		for (const [p, s] of [
			[pcLightPath, pcLightSize],
			[pcDarkPath, pcDarkSize],
			[mobileLightPath, mobileLightSize],
			[mobileDarkPath, mobileDarkSize],
		]) {
			if (s < 20 * 1024) {
				throw new Error(`Screenshot ${p} is too small (<20 KB): ${s} bytes`);
			}
		}

		console.log("\n[PROOFS COMPLETE] All 4 authentic screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[ERROR]", err);
	process.exit(1);
});
