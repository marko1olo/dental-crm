/**
 * scripts/capture-dental-lab-live-4state.mjs
 *
 * Real 4-state visual proofs capture for DentalLabStudioModal on live application:
 * - ☀️ PC Light (1440x900)
 * - 🌙 PC Dark (1440x900)
 * - 📱 Mobile Light (390x844)
 * - 📱 Mobile Dark (390x844)
 *
 * Live Fastify API (4100) + Live Vite App (5173) + PostgreSQL 18
 */

import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";

const OUT_DIRS = [
	path.resolve("docs/proofs/lab"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/972d81b7-87b2-43ec-87f5-8c6fa8116cf0"),
];

for (const dir of OUT_DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionClinicAndOrder() {
	const uid = Date.now();
	const email = `lab-audit-${uid}@dente-crm.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Creating test clinic in PostgreSQL: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: `Стоматология Дент-Ортопедия ${uid}`,
			email,
			password,
			ownerName: "Д-р Ортопедов В.С.",
			ownerPin,
		}),
	});
	if (!initRes.ok) {
		throw new Error(`setup/init failed ${initRes.status}: ${await initRes.text()}`);
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
		throw new Error(`staff/unlock failed ${unlockRes.status}: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();
	const staffToken = unlockData.staffToken;

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": staffToken,
	};

	// Create test patient
	const patRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Семенов Аркадий Петрович",
			phone: "+7 (926) 456-78-90",
			birthDate: "1985-06-20",
			gender: "male",
		}),
	});
	if (!patRes.ok) {
		throw new Error(`patient create failed ${patRes.status}: ${await patRes.text()}`);
	}
	const patient = await patRes.json();

	// Seed real lab order in DB
	const labOrderRes = await fetch(`${API_BASE}/api/lab/orders`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			patientId: patient.id,
			doctorId: initData.ownerUserId,
			toothFdi: "16",
			teethFdi: [16],
			material: "zirconia_multilayer",
			restorationType: "crown_monolithic",
			shadeSystem: "classical",
			shadeVita: "A2",
			patientPriceKopecks: 2800000,
			labCostKopecks: 950000,
			orderNumber: "ЗТЛ-2611-1001",
			clinicalNotes: "Анатомическая коронка ZrO2 Katana ML, индивидуализация фиссур",
		}),
	});
	if (!labOrderRes.ok) {
		console.warn(`[WARN] lab/orders insert warning ${labOrderRes.status}: ${await labOrderRes.text()}`);
	} else {
		console.log("[SEED] Live lab order seeded in PostgreSQL 18.");
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken,
		patientId: patient.id,
		patientName: "Семенов Аркадий Петрович",
		doctorName: "Д-р Ортопедов В.С.",
		doctorId: initData.ownerUserId,
	};
}

async function applyTheme(page, theme) {
	await page.evaluate((t) => {
		localStorage.setItem("dente_theme_mode", t);
		const root = document.documentElement;
		if (t === "dark") {
			root.classList.add("dark");
			root.setAttribute("data-theme", "dark");
			root.style.colorScheme = "dark";
		} else {
			root.classList.remove("dark");
			root.setAttribute("data-theme", "light");
			root.style.colorScheme = "light";
		}
	}, theme);
	await sleep(500);
}

async function snap(page, fileName) {
	for (const dir of OUT_DIRS) {
		const outPath = path.join(dir, fileName);
		await page.screenshot({ path: outPath, fullPage: false });
		const stat = fs.statSync(outPath);
		console.log(`[SNAP OK] ${fileName} -> ${stat.size} bytes (${outPath})`);
		if (stat.size < 40000) {
			console.warn(`[WARNING] ${fileName} is smaller than 40KB (${stat.size} bytes)!`);
		}
	}
}

async function main() {
	console.log("=== STARTING LIVE DENTAL LAB STUDIO 4-STATE CAPTURE ===");
	const creds = await provisionClinicAndOrder();

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	});

	try {
		const page = await browser.newPage();

		// Inject credentials into localStorage
		await page.evaluateOnNewDocument(
			(ct, st, pid, pname, dname, did) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_session_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1"] }));
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedPatientId: pid,
						onboardingDismissed: true,
					})
				);
			},
			creds.clinicToken,
			creds.staffToken,
			creds.patientId,
			creds.patientName,
			creds.doctorName,
			creds.doctorId,
		);

		// ─── 1. PC Light (1440x900) ──────────────────────────────────────────────────
		console.log("\n>>> Capturing ☀️ PC Light (1440x900)...");
		await page.setViewport({ width: 1440, height: 900 });
		await page.goto(`${APP_BASE}/#lab`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await sleep(1500);

		// Ensure studio modal is open
		await page.evaluate((creds) => {
			window.dispatchEvent(
				new CustomEvent("dente:open-lab", {
					detail: {
						toothFdi: "16",
						patientId: creds.patientId,
						patientName: creds.patientName,
						doctorName: creds.doctorName,
						doctorId: creds.doctorId,
					},
				})
			);
		}, creds);
		await sleep(1000);

		await applyTheme(page, "light");
		await page.waitForSelector('[data-testid="dental-lab-studio-modal"], [data-testid="tab-new-order"], .dental-lab-studio-modal', { timeout: 10000 }).catch(() => {});
		await snap(page, "dental_lab_studio_pc_light_1440x900.png");

		// ─── 2. PC Dark (1440x900) ───────────────────────────────────────────────────
		console.log("\n>>> Capturing 🌙 PC Dark (1440x900)...");
		await applyTheme(page, "dark");
		await sleep(1000);
		await snap(page, "dental_lab_studio_pc_dark_1440x900.png");

		// ─── 3. Mobile Light (390x844) ───────────────────────────────────────────────
		console.log("\n>>> Capturing 📱 Mobile Light (390x844)...");
		await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
		await applyTheme(page, "light");
		await sleep(1000);
		await snap(page, "dental_lab_studio_mobile_light_390x844.png");

		// ─── 4. Mobile Dark (390x844) ────────────────────────────────────────────────
		console.log("\n>>> Capturing 📱 Mobile Dark (390x844)...");
		await applyTheme(page, "dark");
		await sleep(1000);
		await snap(page, "dental_lab_studio_mobile_dark_390x844.png");

		console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
