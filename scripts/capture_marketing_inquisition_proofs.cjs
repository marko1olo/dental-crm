/**
 * scripts/capture_marketing_inquisition_proofs.cjs
 * Subagent 5: Marketing Dashboard & Void Balance Stylist.
 * Captures 1440x900 Desktop Light and Desktop Dark screenshots of Marketing Dashboard.
 * Invariants: Mandates 8b, 8c, 8d, 8e (Anti-Void, 2-Column Balance, Pure Theme Proof).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const TARGET_DIRS = [
	path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
	path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_7sins"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d6cbdda0-2ad4-42cc-94ed-b0ee09c3fedf"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
];

for (const d of TARGET_DIRS) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: new Date().toISOString().split("T")[0],
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			phone: "+7 (495) 123-45-67",
			address: "Москва, Столярный переулок, 14",
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "orthopedist"],
				active: true,
			},
		],
		chairs: [
			{
				id: "chair-1",
				name: "Кабинет 1 (Терапия)",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Ковалёв Роман Станиславович",
			phone: "+7 (999) 888-77-66",
			birthDate: "1988-04-12",
			gender: "male",
			notes: "Аллергия на латекс",
		},
	],
	appointments: [],
	communicationTasks: [],
	communicationTemplates: [],
};

const mockRecallReport = {
	examinedPatients: 240,
	byBand: {
		due: 14,
		overdue: 9,
		never_arrived: 5,
		probably_lost: 22,
	},
	candidates: [
		{
			patientId: "pat-1",
			fullName: "Ковалёв Роман Станиславович",
			phone: "+7 (999) 888-77-66",
			lastCompletedAt: "2025-08-10T10:00:00.000Z",
			monthsSinceLastVisit: 7,
			band: "due",
			reason: "Прошло 7 месяцев с последней профгигиены",
		},
	],
	note: "Данные обновлены сегодня в реальном времени.",
};

async function runCapture() {
	console.log("[Playwright] Launching Chrome executable...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const addAuthScript = (ctx) =>
		ctx.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "test-token");
			localStorage.setItem("dente_staff_token", "test-staff-token");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({
					onboardingDismissed: true,
					onboardingStep: "done",
					version: 1,
				}),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({
					dismissed: true,
					step: "done",
					completed: true,
					onboardingDismissed: true,
					onboardingStep: "done",
					version: 1,
				}),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedPatientId: "pat-1",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					state: {
						clinicName: "Стоматология ДЕНТЕ Премиум",
						currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
						flags: { disableTour: true },
					},
				}),
			);
		});

	async function setupRoutes(page) {
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/src/")) return route.continue();

			if (url.includes("/api/patients/recall-candidates")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockRecallReport),
				});
			}

			if (url.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDashboard),
				});
			}

			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						user: {
							id: "doc-1",
							fullName: "Д-р Воронов Алексей Владимирович",
							role: "owner",
							organizationId: "00000000-0000-0000-0000-000000000001",
						},
					}),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ok: true }),
			});
		});
	}

	async function applyTheme(page, theme) {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			if (["dark", "night", "ocean"].includes(th)) {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		}, theme);
		await page.waitForTimeout(600);
	}

	async function saveProof(page, filename, desc) {
		const primaryFile = path.join(TARGET_DIRS[0], filename);
		await page.screenshot({ path: primaryFile, fullPage: false, animations: "disabled" });

		for (let i = 1; i < TARGET_DIRS.length; i++) {
			const dest = path.join(TARGET_DIRS[i], filename);
			fs.copyFileSync(primaryFile, dest);
		}

		const stats = fs.statSync(primaryFile);
		const hash = crypto.createHash("md5").update(fs.readFileSync(primaryFile)).digest("hex");
		console.log(`[Captured] ${filename} (${desc}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`);
		return { filename, size: stats.size, hash };
	}

	// 1. Desktop Suite (1440x900)
	console.log("\n>>> Capturing Marketing Desktop Proofs (1440x900) <<<");
	const desktopContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});
	await addAuthScript(desktopContext);
	const page = await desktopContext.newPage();
	await setupRoutes(page);

	await page.goto("http://127.0.0.1:5173/#marketing", { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForSelector("[data-testid='marketing-view'], #marketing, .marketing-zone", { state: "visible", timeout: 25000 });
	await page.waitForSelector("[data-testid='marketing-two-col-dashboard']", { state: "visible", timeout: 20000 });
	await page.waitForTimeout(1500);

	// 1A. Marketing Desktop Light
	await applyTheme(page, "light");
	await page.waitForTimeout(500);
	await saveProof(page, "36_marketing_desktop_light.png", "Marketing Desktop Light (1440x900)");

	// 1B. Marketing Desktop Dark
	await applyTheme(page, "dark");
	await page.waitForTimeout(500);
	await saveProof(page, "37_marketing_desktop_dark.png", "Marketing Desktop Dark (1440x900)");

	await page.close();
	await desktopContext.close();

	await browser.close();
	console.log("\n>>> Marketing Proofs Captured Successfully! <<<");
}

runCapture().catch((err) => {
	console.error("Marketing capture error:", err);
	process.exit(1);
});
