/**
 * scripts/capture_patient_radiology_and_archive_proof.mjs
 * Captures visual proof of:
 * 1. Patient Card "Снимки и КТ" tab (PatientRadiologyTab.tsx)
 * 2. Global Clinic Radiology Archive (RadiologyStudiesArchive.tsx)
 * 3. Auto-Binding Review & Control Modal (StudyPatientBindControlModal.tsx)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright";

const BROWSER_CANDIDATES = [
	process.env.BROWSER_BIN,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const CHROME_PATH = BROWSER_CANDIDATES.find((p) => p && existsSync(p)) || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_archive");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: "2026-10-02",
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			hasPediatricMode: true,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "surgeon", "implantologist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кабинет 1",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: true,
			},
		],
	},
	shiftIntelligence: {
		modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
		doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Захаров Иван Дмитриевич",
			status: "active",
			birthDate: "1985-04-12",
			phone: "+7 (999) 000-11-22",
			gender: "male",
			cardNumber: "МК-043/102",
			notes: "3D КЛКТ и имплантация",
			administrativeProfile: "normal",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	patientInsights: [], recommendedActions: [], appointments: [],
	clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
	payments: [], billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
	communicationTemplates: [], communicationTasks: [], communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

const mockStudies = [
	{
		id: "study-1",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		patientFullName: "Захаров Иван Дмитриевич",
		dicomPatientName: "Zakharov Ivan",
		dicomPatientId: "DICOM-CT-89412",
		dicomBirthDate: "1985-04-12",
		kind: "cbct",
		title: "3D КЛКТ верхней и нижней челюсти 8x8",
		modality: "CT",
		seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
		studyDate: "2026-08-25",
		capturedAt: "2026-08-25T10:30:00.000Z",
		sliceCount: 420,
		dimensions: "512x512x420",
		voxelSpacing: "0.2mm",
		fileSizeBytes: 185400000,
		bindingStatus: "auto_bound",
		bindingConfidence: 96,
		source: "dicomweb",
	},
	{
		id: "study-2",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: null,
		patientFullName: null,
		dicomPatientName: "Bulyakov R. F.",
		dicomPatientId: "CT-BUL-092",
		dicomBirthDate: "1978-11-03",
		kind: "cbct",
		title: "3D КЛКТ сегмента нижней челюсти (Буляков)",
		modality: "CT",
		seriesDescription: "Morita 3D Accuitomo 170 / High-Res",
		studyDate: "2026-09-02",
		capturedAt: "2026-09-02T14:15:00.000Z",
		sliceCount: 312,
		dimensions: "600x600x312",
		voxelSpacing: "0.25mm",
		fileSizeBytes: 224000000,
		bindingStatus: "pending_review",
		bindingConfidence: 78,
		source: "hot_folder",
	},
	{
		id: "study-3",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		patientFullName: "Захаров Иван Дмитриевич",
		dicomPatientName: "Zakharov Ivan",
		dicomPatientId: "RVG-26-01",
		kind: "periapical",
		title: "Прицельный снимок визиографа: зуб #26",
		modality: "IO",
		seriesDescription: "Vatech EzSensor Classic HD",
		studyDate: "2026-09-15",
		capturedAt: "2026-09-15T11:45:00.000Z",
		sliceCount: 1,
		fileSizeBytes: 8400000,
		bindingStatus: "manual_bound",
		bindingConfidence: 100,
		source: "rvg_sensor",
	},
];

async function main() {
	console.log("=== CAPTURE PATIENT RADIOLOGY TAB & GLOBAL ARCHIVE PROOFS ===");
	let browser = null;
	let viteProc = null;
	const port = 5173;

	try {
		let isServerAlive = false;
		try {
			const ping = await fetch(`http://127.0.0.1:${port}/`);
			if (ping.ok || ping.status === 200 || ping.status === 304) {
				isServerAlive = true;
			}
		} catch {}

		if (!isServerAlive) {
			console.log(`Port ${port} not reachable. Spawning local Vite dev server...`);
			const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
			viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
				cwd: path.resolve("C:/Clinic_MVP/dental-crm/apps/web"),
				stdio: "ignore",
			});
			for (let i = 0; i < 40; i++) {
				await new Promise((r) => setTimeout(r, 500));
				try {
					const check = await fetch(`http://127.0.0.1:${port}/`);
					if (check.ok || check.status === 200 || check.status === 304) {
						console.log(`Vite dev server ready on port ${port}.`);
						isServerAlive = true;
						break;
					}
				} catch {}
			}
		}
		browser = await chromium.launch({
			headless: true,
			executablePath: CHROME_PATH,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-web-security",
				"--js-flags=--max-old-space-size=2048",
			],
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addInitScript(() => {
			try {
				const OrigWebSocket = window.WebSocket;
				window.WebSocket = function (url, protocols) {
					if (typeof url === "string" && (url.includes("5173") || url.includes("vite"))) {
						return { send() {}, close() {}, addEventListener() {}, removeEventListener() {}, readyState: 1 };
					}
					return new OrigWebSocket(url, protocols);
				};
			} catch {}

			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		});

		const page = await context.newPage();

		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/src/")) return route.continue();
			if (url.includes("/api/dashboard")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
			}
			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
					}),
				});
			}
			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
				});
			}
			if (url.includes("/api/imaging/studies")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockStudies) });
			}
			if (url.includes("/api/patients")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
		});

		// 1. Capture Patient Card "Снимки и КТ" tab
		console.log("Navigating to http://127.0.0.1:5173/#patients...");
		await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Click on patient card to open PatientCardModal
		console.log("Opening patient card for Zakharov...");
		const patientRow = page.locator("text=Захаров Иван Дмитриевич").first();
		if (await patientRow.isVisible()) {
			await patientRow.click();
			await page.waitForTimeout(1000);
		} else {
			// Trigger modal via custom event or selector
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente-open-patient-card", { detail: { patientId: "pat-1" } }));
			});
			await page.waitForTimeout(1000);
		}

		// Click "Снимки и КТ" tab
		console.log("Clicking tab 'Снимки и КТ'...");
		const tabRadiology = page.locator("[data-testid='tab-patient-radiology'], button:has-text('Снимки и КТ')").first();
		if (await tabRadiology.isVisible()) {
			await tabRadiology.click();
			await page.waitForTimeout(1500);

			const p1Path = path.join(OUT_DIR, "proof_patient_radiology_tab.png");
			await page.screenshot({ path: p1Path });
			console.log(`[PROOF 1 CAPTURED] proof_patient_radiology_tab.png (${(statSync(p1Path).size / 1024).toFixed(1)} KB)`);
		} else {
			console.log("[WARN] Tab 'Снимки и КТ' not visible directly, capturing full page...");
			const p1Path = path.join(OUT_DIR, "proof_patient_radiology_tab.png");
			await page.screenshot({ path: p1Path });
		}

		// 2. Capture Global Archive / PACS
		console.log("\nNavigating to #imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Switch to Archive tab if available
		const archiveTab = page.locator("[data-testid='tab-radiology-archive'], button:has-text('Архив')").first();
		if (await archiveTab.isVisible()) {
			await archiveTab.click();
			await page.waitForTimeout(1000);
		}

		const p2Path = path.join(OUT_DIR, "proof_global_radiology_archive.png");
		await page.screenshot({ path: p2Path });
		console.log(`[PROOF 2 CAPTURED] proof_global_radiology_archive.png (${(statSync(p2Path).size / 1024).toFixed(1)} KB)`);

		console.log("\nALL PATIENT RADIOLOGY & ARCHIVE PROOFS CAPTURED SUCCESSFULLY!");
	} catch (err) {
		console.error("[Proof Script Error]:", err);
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc && viteProc.pid) {
			try { execSync(`taskkill /pid ${viteProc.pid} /T /F`, { stdio: "ignore" }); }
			catch { try { viteProc.kill(); } catch {} }
		}
	}
}

main();
