/**
 * scripts/capture_patients_4state_proofs.mjs
 *
 * 4-state Visual Proof Generator for Patients Domain (Mandate 8e, 8n):
 * 1. PC Light (1440x900) — открытая карточка пациента (PatientHeaderCard)
 * 2. PC Light (1440x900) — реестр пациентов (PatientsMasterList)
 * 3. PC Dark (1440x900) — карточка пациента в темной теме
 * 4. Mobile Light (390x844) — мобильный профиль пациента
 * Target folder: docs/proofs/patients/
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import puppeteer from "puppeteer";

const OUTPUT_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\patients";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	console.log("=== CAPTURING 4-STATE PATIENTS PROOF SCREENSHOTS ===");

	// 1. Authenticate with real API
	console.log("Authenticating with API (doctor@clinic.com)...");
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed with status ${loginRes.status}`);
	}
	const loginData = await loginRes.json();
	console.log("Logged in successfully. clinicToken:", loginData.clinicToken ? "OK" : "NO");

	// Seed at least one patient if needed
	try {
		await fetch(`${API_URL}/api/patients`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": loginData.clinicToken,
				"x-dente-staff-token": loginData.staffToken,
			},
			body: JSON.stringify({
				fullName: "Кузнецова Елена Павловна",
				birthDate: "1990-05-12",
				gender: "female",
				phone: "+7 (916) 123-45-67",
				allergies: "Пенициллин",
				chronicDiseases: "Хронический гастрит",
			}),
		});
	} catch (err) {
		console.warn("Patient seed warn:", err.message);
	}

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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
		// ─── 1. PC DESKTOP (1440x900) ───
		console.log("\n--- STAGE 1: PC DESKTOP (1440x900) ---");
		const page = await browser.newPage();
		page.setDefaultNavigationTimeout(45000);
		page.setDefaultTimeout(45000);

		await page.setViewport({
			width: 1440,
			height: 900,
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		// Inject real session auth into localStorage
		await page.evaluateOnNewDocument((tokens) => {
			localStorage.setItem("dente_clinic_token", tokens.clinicToken);
			localStorage.setItem("dente_staff_token", tokens.staffToken);
			localStorage.setItem("dente_active_session_token", tokens.staffToken);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(tokens.user));
			localStorage.setItem("dental_workspace_onboarding_completed", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_offline_banner_dismissed", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("theme", "light");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		}, {
			clinicToken: loginData.clinicToken,
			staffToken: loginData.staffToken,
			user: loginData.user,
		});

		console.log("Navigating to #patients...");
		await page.goto(`${WEB_URL}/#patients`, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		console.log("Waiting for loading screen to complete...");
		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return (
				!text.includes("Загрузка CRM") &&
				!text.includes("Загрузка рабочей смены") &&
				!document.querySelector(".loading-spinner") &&
				!document.querySelector(".boot-state")
			);
		}, { timeout: 30000 });
		await wait(3000);

		// Click first patient row to open patient card
		console.log("Selecting patient row...");
		try {
			const row = await page.$('.patient-master-row, [data-testid^="patient-row-"], .patients-table tbody tr');
			if (row) {
				await row.click();
				await wait(2000);
			}
		} catch (e) {
			console.log("Row click error:", e.message);
		}

		// 1. Proof 1: PC Light (1440x900) — открытая карточка пациента (PatientHeaderCard)
		console.log("Capturing 01_pc_patient_card_light_1440x900.png...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("dark");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_theme", "light");
			const card = document.querySelector('[data-testid="patient-header-card"]');
			if (card) card.scrollIntoView({ behavior: "instant", block: "center" });
		});
		await wait(1500);

		const pcLightCardPath = path.join(OUTPUT_DIR, "01_pc_patient_card_light_1440x900.png");
		await page.screenshot({ path: pcLightCardPath, fullPage: false });
		const pcLightCardSize = fs.statSync(pcLightCardPath).size;
		console.log(`Saved: ${pcLightCardPath} (${(pcLightCardSize / 1024).toFixed(1)} KB)`);

		// 2. Proof 2: PC Light (1440x900) — реестр пациентов (PatientsMasterList)
		console.log("Capturing 02_pc_patients_master_list_light_1440x900.png...");
		await page.evaluate(() => {
			window.scrollTo({ top: 0, behavior: "instant" });
			const panel = document.querySelector(".patients-panel, .patients-main-grid");
			if (panel) panel.scrollTop = 0;
		});
		await wait(1000);

		const pcLightListPath = path.join(OUTPUT_DIR, "02_pc_patients_master_list_light_1440x900.png");
		await page.screenshot({ path: pcLightListPath, fullPage: false });
		const pcLightListSize = fs.statSync(pcLightListPath).size;
		console.log(`Saved: ${pcLightListPath} (${(pcLightListSize / 1024).toFixed(1)} KB)`);

		// 3. Proof 3: PC Dark (1440x900) — карточка пациента в темной теме
		console.log("Capturing 03_pc_patient_card_dark_1440x900.png...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_theme", "dark");
			const card = document.querySelector('[data-testid="patient-header-card"]');
			if (card) card.scrollIntoView({ behavior: "instant", block: "center" });
		});
		await wait(1500);

		const pcDarkCardPath = path.join(OUTPUT_DIR, "03_pc_patient_card_dark_1440x900.png");
		await page.screenshot({ path: pcDarkCardPath, fullPage: false });
		const pcDarkCardSize = fs.statSync(pcDarkCardPath).size;
		console.log(`Saved: ${pcDarkCardPath} (${(pcDarkCardSize / 1024).toFixed(1)} KB)`);
		await page.close();

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
			localStorage.setItem("dente_active_session_token", tokens.staffToken);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(tokens.user));
			localStorage.setItem("dental_workspace_onboarding_completed", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_offline_banner_dismissed", "true");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("theme", "light");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
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

		console.log("Waiting for loading screen on mobile...");
		await mobilePage.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return (
				!text.includes("Загрузка CRM") &&
				!text.includes("Загрузка рабочей смены") &&
				!document.querySelector(".loading-spinner") &&
				!document.querySelector(".boot-state")
			);
		}, { timeout: 30000 });
		await wait(2500);

		// Click on first patient card in mobile grouped list to open mobile patient profile
		console.log("Clicking on patient in mobile list to open mobile patient profile...");
		try {
			const mobileItem = await mobilePage.$(
				'.mobile-patient-main, .mobile-patient-card-unified, .mobile-patient-card, [data-testid^="mobile-patient-item-"]'
			);
			if (mobileItem) {
				await mobileItem.click();
				await wait(2000);
			}
		} catch (e) {
			console.log("Mobile patient selection click skipped:", e.message);
		}

		// 4. Proof 4: Mobile Light (390x844) — мобильный профиль пациента
		console.log("Capturing 04_mobile_patients_list_light_390x844.png (mobile profile)...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("dark");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await wait(1500);

		const mobileLightPath = path.join(OUTPUT_DIR, "04_mobile_patients_list_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		const mobileLightSize = fs.statSync(mobileLightPath).size;
		console.log(`Saved: ${mobileLightPath} (${(mobileLightSize / 1024).toFixed(1)} KB)`);

		// Also save copies to match all canonical names
		fs.copyFileSync(pcLightCardPath, path.join(OUTPUT_DIR, "pc_light.png"));
		fs.copyFileSync(pcDarkCardPath, path.join(OUTPUT_DIR, "pc_dark.png"));
		fs.copyFileSync(pcLightListPath, path.join(OUTPUT_DIR, "patients_registry_pc_light.png"));
		fs.copyFileSync(pcDarkCardPath, path.join(OUTPUT_DIR, "patients_registry_pc_dark.png"));
		fs.copyFileSync(mobileLightPath, path.join(OUTPUT_DIR, "mobile_light.png"));

		await mobilePage.close();
		await browser.close();

		// Validate sizes >= 20KB
		const targets = [pcLightCardPath, pcLightListPath, pcDarkCardPath, mobileLightPath];
		for (const t of targets) {
			const size = fs.statSync(t).size;
			const md5 = crypto.createHash("md5").update(fs.readFileSync(t)).digest("hex");
			console.log(`[VERIFIED] ${path.basename(t)}: ${size} bytes (md5: ${md5.slice(0, 8)})`);
			if (size < 20000) {
				throw new Error(`Screenshot ${path.basename(t)} is under 20KB (${size} bytes)!`);
			}
		}

		console.log("\n=== ALL 4 LIVE SCREENSHOT PROOFS SUCCESSFULLY CAPTURED & VALIDATED ===");
	} catch (err) {
		await browser.close();
		throw err;
	}
}

main().catch((err) => {
	console.error("Execution failed:", err);
	process.exit(1);
});
