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
							notes: "Аллергия на лидокаин.",
							administrativeProfile: "normal",
							createdAt: "2026-01-01T00:00:00Z",
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
							allergies: ["Лидокаин"],
							somaticAlerts: [],
							chiefComplaintRu: "Острая ноющая боль в зубе 4.6",
							mkb10Code: "K04.0",
							primaryDiagnosisRu: "Острый пульпит зуба 4.6",
							toothNumber: 46,
							appointmentStatus: "in_chair",
							services: [
								{ code: "A16.07.002", nameRu: "Препарирование каналов 4.6", priceKop: 850000, labCostKop: 0, materialCostKop: 50000, pieceRatePercent: 25 },
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
						complaint: "Острая ноющая боль в зубе 4.6",
						anamnesis: "Заболел 2 дня назад.",
						objectiveStatus: "Зуб 4.6 глубокая кариозная полость.",
						diagnosis: "K04.0 Острый пульпит",
						treatmentPlan: "Эндодонтическое лечение 4.6",
						doctorSummary: "Каналы обработаны ProTaper Gold.",
						createdAt: "2026-08-29T10:00:00Z",
						updatedAt: "2026-08-29T10:25:00Z",
					},
					visitCloseChecklist: { visitId: "v-1", readyToSign: true, score: 100, nextAction: "sign_043u", blockingItems: 0, items: [] },
					protocolTemplates: [],
					treatmentPlanItems: [],
					treatmentPlanScenarios: [],
					clinicalRuleEvaluations: [],
					clinicalRuleSummary: { activeRules: 2, evaluatedRules: 2, unresolved: 0, blockers: 0, warnings: 1, requiredServices: 0, coveredRules: 2 },
					payments: [],
					billingSummary: { totalPlannedRub: 8500, totalDiscountRub: 0, totalPaidRub: 8500, totalDueRub: 0, taxDeductionEligibleRub: 8500, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
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
					notes: "Аллергия на лидокаин.",
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
		await page.waitForTimeout(300);

		const keys = ["1", "2", "3", "4"];
		for (const k of keys) {
			const numBtn = await page.$(`button:has-text("${k}")`);
			if (numBtn) {
				await numBtn.click();
				await page.waitForTimeout(100);
			}
		}
		await page.waitForTimeout(1000);
	}
}

async function capture() {
	console.log("Launching Edge for Mobile Shift Cockpit visual audit...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
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
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
		});

		await mPage.waitForTimeout(500);
		await unlockStaffIfPresent(mPage);

		// Switch role on mobile
		const rolePill = await mPage.$('text="Роль Владелец"') || await mPage.$('summary:has-text("Роль")');
		if (rolePill) {
			console.log("Clicking role pill on mobile...");
			await rolePill.click();
			await mPage.waitForTimeout(400);

			const doctorOption = await mPage.$('button:has-text("Врач")');
			if (doctorOption) {
				console.log("Switching role to Врач on mobile...");
				await doctorOption.click();
				await mPage.waitForTimeout(600);
			}
		}

		console.log("Capturing 38_doctor_shift_cockpit_mobile_light.png on #shift...");
		await mPage.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_light.png"),
			fullPage: false,
		});

		// Switch to Dark Mode
		console.log("Switching Mobile to Dark Mode...");
		await mPage.evaluate(() => {
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await mPage.waitForTimeout(1000);

		console.log("Capturing 38_doctor_shift_cockpit_mobile_dark.png on #shift...");
		await mPage.screenshot({
			path: path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_dark.png"),
			fullPage: false,
		});

		await mobileContext.close();
		console.log("MOBILE SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Mobile capture script error:", err);
	process.exit(1);
});
