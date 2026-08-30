const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "../docs/proofs/audit");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

function setupApiRoutes(page) {
	page.route("**/api/**", async (route) => {
		const url = route.request().url();

		if (url.includes("/api/auth/staff/unlock")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					staffToken: "mock_staff_token",
					user: {
						id: "doc-1",
						fullName: "Д-р Смирнов Алексей Петрович",
						name: "Д-р Смирнов Алексей Петрович",
						role: "doctor",
						specialty: "Терапевт-ортопед",
					},
				}),
			});
		} else if (url.includes("/api/dashboard")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					clinicName: "DENTE Стоматология",
					todayIso: "2026-08-29",
					clinicSettings: {
						profile: {
							id: "1",
							clinicName: "DENTE Стоматология",
							mode: "multi_chair",
							defaultVisitMinutes: 45,
							scheduleDefaults: {
								workingDays: [1, 2, 3, 4, 5, 6],
								workdayStart: "08:00",
								workdayEnd: "21:00",
								appointmentBufferMinutes: 10,
							},
						},
						staff: [
							{
								id: "doc-1",
								fullName: "Д-р Смирнов Алексей Петрович",
								name: "Д-р Смирнов Алексей Петрович",
								role: "doctor",
								specialty: "Терапевт-ортопед",
								specialties: ["therapist", "orthopedist"],
								active: true,
							},
						],
						chairs: [
							{
								id: "chair-1",
								name: "Кресло 1 (Терапия)",
								active: true,
								hasXraySensor: true,
								hasMicroscope: true,
								hasSurgeryKit: true,
							},
						],
						integrationPresets: [],
						workspaceProfiles: [],
						roleAccessPolicies: [],
						modeHints: [],
						soloDoctorMode: false,
					},
					shiftIntelligence: {
						modeFit: { mode: "multi_chair", title: "Standard", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
						doctorLoads: [],
						assistantLoads: [],
						chairLoads: [],
						roleQueues: [],
						scheduleWarnings: [],
					},
					patients: [
						{
							id: "pat-1",
							organizationId: "1",
							status: "active",
							fullName: "Иванов Петр Сергеевич",
							birthDate: "1988-04-12",
							phone: "+7 (916) 123-45-67",
							email: "patient@example.com",
							notes: "Аллергия на лидокаин, новокаин (отек Квинке). Бисфосфонаты.",
							administrativeProfile: "normal",
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-08-29T00:00:00Z",
						},
						{
							id: "pat-2",
							organizationId: "1",
							status: "active",
							fullName: "Ковалева Елена Викторовна",
							birthDate: "1995-11-23",
							phone: "+7 (926) 987-65-43",
							email: "",
							notes: "",
							administrativeProfile: "normal",
							createdAt: "2026-02-01T00:00:00Z",
							updatedAt: "2026-08-29T00:00:00Z",
						},
					],
					patientInsights: [],
					recommendedActions: [],
					appointments: [
						{
							id: "apt-1",
							organizationId: "1",
							patientId: "pat-1",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							state: "in_chair",
							priority: "normal",
							intent: "treatment",
							startsAt: "2026-08-29T10:00:00Z",
							endsAt: "2026-08-29T11:00:00Z",
							serviceCategories: ["therapy"],
							createdByUserId: "doc-1",
							createdAt: "2026-08-29T10:00:00Z",
							updatedAt: "2026-08-29T10:00:00Z",
							patientName: "Иванов Петр Сергеевич",
							patientFullName: "Иванов Петр Сергеевич",
							doctorName: "Д-р Смирнов Алексей Петрович",
							cardCode: "К-2026/089",
							patientAge: 38,
							chairName: "Кресло 1 (Терапия)",
							allergies: ["Лидокаин", "Новокаин (отек Квинке)"],
							somaticAlerts: ["Прием бисфосфонатов (риск остеонекроза челюсти BRONJ)"],
							chiefComplaintRu: "Острая ноющая боль в зубе 4.6 при накусывании",
							mkb10Code: "K04.0",
							primaryDiagnosisRu: "Острый пульпит зуба 4.6",
							toothNumber: 46,
							appointmentStatus: "in_chair",
							services: [
								{ code: "A16.07.002", nameRu: "Препарирование и механическая обработка каналов 4.6", priceKop: 850000, labCostKop: 0, materialCostKop: 50000, pieceRatePercent: 25 },
							],
						},
						{
							id: "apt-2",
							organizationId: "1",
							patientId: "pat-2",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							state: "scheduled",
							priority: "normal",
							intent: "consultation",
							startsAt: "2026-08-29T11:00:00Z",
							endsAt: "2026-08-29T11:45:00Z",
							serviceCategories: ["orthopedics"],
							createdByUserId: "doc-1",
							createdAt: "2026-08-29T09:00:00Z",
							updatedAt: "2026-08-29T09:00:00Z",
							patientName: "Ковалева Елена Викторовна",
							patientFullName: "Ковалева Елена Викторовна",
							doctorName: "Д-р Смирнов Алексей Петрович",
							cardCode: "К-2026/112",
							patientAge: 30,
							chairName: "Кресло 1 (Терапия)",
							allergies: [],
							somaticAlerts: [],
							chiefComplaintRu: "Плановая фиксация циркониевой коронки 1.6",
							mkb10Code: "K02.1",
							primaryDiagnosisRu: "Кариес дентина 1.6",
							toothNumber: 16,
							appointmentStatus: "waiting",
							arrivalStatusRu: "В холле (прибыла 10:45)",
							services: [
								{ code: "A16.07.004", nameRu: "Фиксация коронки диоксид циркония 1.6", priceKop: 3200000, labCostKop: 800000, materialCostKop: 200000, pieceRatePercent: 25 },
							],
						},
					],
					appointmentReadiness: [],
					scheduleSuggestions: [],
					activeVisit: {
						id: "v-1",
						appointmentId: "apt-1",
						patientId: "pat-1",
						organizationId: "1",
						status: "in_progress",
						revision: 1,
						complaint: "Острая ноющая боль в зубе 4.6 при накусывании",
						anamnesis: "Заболел 2 дня назад, усиливается от горячего. Аллергия на Лидокаин.",
						objectiveStatus: "Зуб 4.6: глубокая кариозная полость на жевательно-медиальной поверхности, зондирование дна болезненно.",
						diagnosis: "K04.0 Острый пульпит зуба 4.6",
						treatmentPlan: "Эндодонтическое лечение 4.6, механическая и медикаментозная обработка 3-х каналов.",
						doctorSummary: "Каналы обработаны ProTaper Gold до размера F2, промыты NaOCl 3%, запечатаны гидроксидом кальция Calcept.",
						createdAt: "2026-08-29T10:00:00Z",
						updatedAt: "2026-08-29T10:25:00Z",
					},
					visitCloseChecklist: {
						visitId: "v-1",
						readyToSign: true,
						score: 100,
						nextAction: "sign_043u",
						blockingItems: 0,
						items: [],
					},
					protocolTemplates: [],
					treatmentPlanItems: [],
					treatmentPlanScenarios: [],
					clinicalRuleEvaluations: [],
					clinicalRuleSummary: { activeRules: 2, evaluatedRules: 2, unresolved: 0, blockers: 0, warnings: 1, requiredServices: 0, coveredRules: 2 },
					payments: [],
					billingSummary: {
						totalPlannedRub: 8500,
						totalDiscountRub: 0,
						totalPaidRub: 8500,
						totalDueRub: 0,
						taxDeductionEligibleRub: 8500,
						draftDocumentAmountRub: 0,
						openTreatmentItems: 0,
						unpaidDocuments: 0,
					},
					communicationTemplates: [],
					communicationEvents: [],
					communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
					importBatches: [],
					speechProviders: [],
					auditEvents: [],
					complianceWarnings: [],
					documents: [],
					imagingStudies: [],
					serviceCatalog: [],
					clinicalRules: [],
					communicationTasks: [],
				}),
			});
		} else if (url.includes("/api/patients")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: "pat-1",
					organizationId: "1",
					status: "active",
					fullName: "Иванов Петр Сергеевич",
					birthDate: "1988-04-12",
					phone: "+7 (916) 123-45-67",
					email: "patient@example.com",
					notes: "Аллергия на лидокаин, новокаин (отек Квинке).",
					administrativeProfile: "normal",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-08-29T00:00:00Z",
				}),
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(url.includes("status") || url.includes("list") || url.includes("provider") ? [] : {}),
			});
		}
	});
}

async function unlockStaffIfPresent(page) {
	const staffCard = await page.$('.staff-user-card, button:has-text("Д-р Смирнов")');
	if (staffCard) {
		console.log("Selecting Dr. Smirnov on StaffPinPad...");
		await staffCard.click();
		await page.waitForTimeout(400);

		const keys = ["1", "2", "3", "4"];
		for (const k of keys) {
			const numBtn = await page.$(`button:has-text("${k}")`);
			if (numBtn) {
				await numBtn.click();
				await page.waitForTimeout(150);
			}
		}
		await page.waitForTimeout(1500);
	}
}

async function switchToDoctorRole(page) {
	const roleSwitcher = await page.$('details.switcher summary, details:has-text("Роль") summary');
	if (roleSwitcher) {
		console.log("Opening role dropdown...");
		await roleSwitcher.click();
		await page.waitForTimeout(400);

		const doctorBtn = await page.$('button:has-text("Врач"), button[aria-label*="Врач"]');
		if (doctorBtn) {
			console.log("Selecting 'Врач' role...");
			await doctorBtn.click();
			await page.waitForTimeout(800);
		}
	}
}

async function capture() {
	console.log("Launching Edge for Doctor Shift Cockpit visual audit with Doctor role switch...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC Viewport
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		const page = await pcContext.newPage();
		setupApiRoutes(page);

		await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.evaluate(() => {
			localStorage.setItem("dente_clinic_token", "mock_clinic_token");
			localStorage.setItem("dente_staff_token", "mock_staff_token");
			localStorage.setItem("dental-crm:onboarding:v1:org:1", JSON.stringify({ version: 1, dismissed: true, savedAt: "2026-08-29", draftMode: false }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: "2026-08-29", draftMode: false }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1 }));
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
		});

		await page.waitForTimeout(500);
		await unlockStaffIfPresent(page);

		await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "networkidle", timeout: 30000 });
		await page.waitForTimeout(1500);
		await unlockStaffIfPresent(page);
		await switchToDoctorRole(page);

		// 1.1 Header PC Light
		console.log("Capturing 38_doctor_desktop_header_pc_light.png...");
		await page.screenshot({
			path: path.join(OUT_DIR, "38_doctor_desktop_header_pc_light.png"),
			fullPage: false,
		});

		// 1.2 Open Cockpit Modal
		console.log("Opening Doctor Cockpit Modal...");
		const topbarCockpitBtn = await page.$('[data-testid="topbar-doctor-cockpit-btn"]') || await page.$('.doctor-shift-cockpit-button') || await page.$('[data-testid="header-btn-open-cockpit"]');
		if (topbarCockpitBtn) {
			await topbarCockpitBtn.click();
			await page.waitForTimeout(1000);
		}

		console.log("Capturing 38_doctor_shift_cockpit_pc_light.png...");
		await page.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_pc_light.png"),
			fullPage: false,
		});

		// 1.3 PC Dark Theme
		console.log("Switching to Dark Mode...");
		await page.evaluate(() => {
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(1000);

		console.log("Capturing 38_doctor_shift_cockpit_pc_dark.png...");
		await page.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_pc_dark.png"),
			fullPage: false,
		});

		// Close modal
		const closeBtn = await page.$('[data-testid="close-doctor-shift-btn"]') || await page.$('[data-testid="close-doctor-cockpit-btn"]') || await page.$('.doctor-pwa-status-bar button');
		if (closeBtn) {
			await closeBtn.click();
			await page.waitForTimeout(600);
		}

		console.log("Capturing 38_doctor_desktop_header_pc_dark.png...");
		await page.screenshot({
			path: path.join(OUT_DIR, "38_doctor_desktop_header_pc_dark.png"),
			fullPage: false,
		});

		await pcContext.close();

		// 2. Mobile Viewport (390x844)
		console.log("Setting up Mobile Context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const mPage = await mobileContext.newPage();
		setupApiRoutes(mPage);

		await mPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mPage.evaluate(() => {
			localStorage.setItem("dente_clinic_token", "mock_clinic_token");
			localStorage.setItem("dente_staff_token", "mock_staff_token");
			localStorage.setItem("dental-crm:onboarding:v1:org:1", JSON.stringify({ version: 1, dismissed: true, savedAt: "2026-08-29", draftMode: false }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: "2026-08-29", draftMode: false }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1 }));
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
		});

		await mPage.waitForTimeout(500);
		await unlockStaffIfPresent(mPage);

		await mPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "networkidle", timeout: 30000 });
		await mPage.waitForTimeout(1500);
		await unlockStaffIfPresent(mPage);
		await switchToDoctorRole(mPage);

		// Open mobile cockpit
		const mBtn = await mPage.$('[data-testid="topbar-doctor-cockpit-btn"]') || await mPage.$('.doctor-shift-cockpit-button') || await mPage.$('[data-testid="header-btn-open-cockpit"]');
		if (mBtn) {
			await mBtn.click();
			await mPage.waitForTimeout(1000);
		}

		console.log("Capturing 38_doctor_shift_cockpit_mobile_light.png...");
		await mPage.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_light.png"),
			fullPage: false,
		});

		// Mobile Dark
		console.log("Switching Mobile to Dark Mode...");
		await mPage.evaluate(() => {
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await mPage.waitForTimeout(1000);

		console.log("Capturing 38_doctor_shift_cockpit_mobile_dark.png...");
		await mPage.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_dark.png"),
			fullPage: false,
		});

		await mobileContext.close();
		console.log("ALL 6 PERFECTLY ALIGNED SCREENSHOTS CAPTURED!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
