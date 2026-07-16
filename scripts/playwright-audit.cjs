const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const artifactsDir = path.join(__dirname, "../artifacts/screenshots");
if (!fs.existsSync(artifactsDir)) {
	fs.mkdirSync(artifactsDir, { recursive: true });
}

(async () => {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});

	const page = await context.newPage();

	page.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
		}
	});
	page.on("pageerror", (err) => {
		console.log("[BROWSER EXCEPTION]:", err.toString());
	});

	// Mock APIs
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					clinicName: "Mock Clinic",
					todayIso: "2026-07-06",
					clinicSettings: {
						profile: {
							id: "1",
							clinicName: "Mock",
							mode: "one_chair",
							defaultVisitMinutes: 45,
							scheduleDefaults: {
								workingDays: [1, 2, 3, 4, 5],
								workdayStart: "09:00",
								workdayEnd: "20:00",
								appointmentBufferMinutes: 15,
							},
						},
						staff: [
							{
								id: "doctor1",
								fullName: "Dr. Smith",
								role: "doctor",
								specialties: ["therapist"],
								active: true,
							},
						],
						chairs: [
							{
								id: "chair1",
								name: "Chair 1",
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
						modeFit: {
							mode: "one_chair",
							title: "Test",
							fitScore: 100,
							blockers: [],
							upgrades: [],
							lowFrictionNextStep: "ready",
						},
						doctorLoads: [],
						assistantLoads: [],
						chairLoads: [],
						roleQueues: [],
						scheduleWarnings: [],
					},
					patients: [
						{
							id: "p1",
							organizationId: "1",
							status: "active",
							fullName: "Test Patient",
							birthDate: "1990-01-01",
							phone: "+1234567890",
							email: "",
							notes: "",
							administrativeProfile: "normal",
							createdAt: "2026-07-06T00:00:00Z",
							updatedAt: "2026-07-06T00:00:00Z",
						},
					],
					patientInsights: [],
					recommendedActions: [],
					appointments: [
						{
							id: "app1",
							organizationId: "1",
							patientId: "p1",
							doctorUserId: "doctor1",
							chairId: "chair1",
							state: "scheduled",
							priority: "normal",
							intent: "treatment",
							startsAt: "2026-07-06T10:00:00Z",
							endsAt: "2026-07-06T11:00:00Z",
							serviceCategories: [],
							createdByUserId: "doctor1",
							createdAt: "2026-07-06T09:00:00Z",
							updatedAt: "2026-07-06T09:00:00Z",
							patientName: "Test Patient",
							doctorName: "Dr. Smith",
						},
					],
					appointmentReadiness: [],
					scheduleSuggestions: [],
					activeVisit: {
						id: "v1",
						appointmentId: "app1",
						patientId: "p1",
						organizationId: "1",
						status: "draft",
						revision: 1,
						complaint: null,
						anamnesis: null,
						objectiveStatus: null,
						diagnosis: null,
						treatmentPlan: null,
						doctorSummary: null,
						createdAt: "2026-07-06T10:00:00Z",
						updatedAt: "2026-07-06T10:00:00Z",
					},
					visitCloseChecklist: {
						visitId: "v1",
						readyToSign: false,
						score: 0,
						nextAction: "review",
						blockingItems: 0,
						items: [],
					},
					protocolTemplates: [],
					treatmentPlanItems: [],
					treatmentPlanScenarios: [],
					clinicalRuleEvaluations: [],
					clinicalRuleSummary: {
						activeRules: 0,
						evaluatedRules: 0,
						unresolved: 0,
						blockers: 0,
						warnings: 0,
						requiredServices: 0,
						coveredRules: 0,
					},
					payments: [],
					billingSummary: {
						totalPlannedRub: 0,
						totalDiscountRub: 0,
						totalPaidRub: 0,
						totalDueRub: 0,
						taxDeductionEligibleRub: 0,
						draftDocumentAmountRub: 0,
						openTreatmentItems: 0,
						unpaidDocuments: 0,
					},
					communicationTemplates: [],
					communicationEvents: [],
					communicationSummary: {
						openTasks: 0,
						urgentTasks: 0,
						dueToday: 0,
						overdue: 0,
						completedToday: 0,
						appointmentConfirmations: 0,
						paymentReminders: 0,
						postVisitInstructions: 0,
					},
					importBatches: [],
					speechProviders: [],
					auditEvents: [],
					complianceWarnings: [],
					documents: [],
					imagingStudies: [
						{
							id: "study1",
							patientId: "p1",
							title: "Test CBCT",
							kind: "cbct",
							status: "completed",
							dicomStudyUid: "1.2.3",
						},
					],
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
					id: "p1",
					organizationId: "1",
					status: "active",
					fullName: "Test Patient",
					birthDate: "1990-01-01",
					phone: "+1234567890",
					email: "",
					notes: "",
					administrativeProfile: "normal",
					createdAt: "2026-07-06T00:00:00Z",
					updatedAt: "2026-07-06T00:00:00Z",
				}),
			});
		} else {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(
					url.includes("status") ||
						url.includes("list") ||
						url.includes("provider")
						? []
						: {},
				),
			});
		}
	});

	console.log("Navigating to http://127.0.0.1:5173/");
	await page.goto("http://127.0.0.1:5173/");
	await page.evaluate(() => {
		localStorage.setItem("dente_clinic_token", "mock_clinic_token");
		localStorage.setItem("dente_staff_token", "mock_token");
		localStorage.setItem(
			"dental-crm:onboarding:v1:org:1",
			JSON.stringify({
				version: 1,
				dismissed: true,
				savedAt: "2026-07-06",
				draftMode: false,
			}),
		);
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({
				version: 1,
				dismissed: true,
				savedAt: "2026-07-06",
				draftMode: false,
			}),
		);
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({ onboardingDismissed: true, version: 1 }),
		);
	});
	await page.reload({ waitUntil: "domcontentloaded" });

	// Handle Login / Boot State
	try {
		console.log("Waiting for boot unlock form...");
		await page.waitForSelector('.boot-unlock-form input[type="password"]', {
			timeout: 2000,
		});
		console.log("Filling password...");
		await page.fill('.boot-unlock-form input[type="password"]', "dente123");
		await page.click('.boot-unlock-form button[type="submit"]');
		await page.waitForTimeout(1000);
	} catch (e) {
		console.log("No boot unlock screen.");
	}

	// Handle Onboarding and StaffPinPad
	try {
		console.log("Checking for Onboarding...");
		await page.waitForSelector(".onboarding-panel button:nth-of-type(2)", {
			timeout: 2000,
		});
		await page.click(".onboarding-panel button:nth-of-type(2)");
		await page.waitForTimeout(1000);
		console.log("Clicked skip onboarding");
	} catch (e) {
		console.log("No onboarding screen found.");
	}

	try {
		console.log("Checking for StaffPinPad...");
		await page.waitForSelector('text="Dr. Smith"', { timeout: 2000 });
		await page.click('text="Dr. Smith"');
		await page.waitForTimeout(500);
		const pinInput = await page.$('input[type="password"]');
		if (pinInput) {
			await pinInput.fill("0000");
			await page.keyboard.press("Enter");
			await page.waitForTimeout(1000);
		}
	} catch (e) {
		console.log("No StaffPinPad found.");
	}

	// Wait for workspace to load
	require("fs").writeFileSync(
		"artifacts/debug_final.html",
		await page.content(),
	);
	console.log("Waiting for workspace...");
	await page.waitForSelector(".app-shell", { timeout: 10000 });

	// Take Screenshots of all tabs
	const tabs = [
		{ name: "Dashboard", hash: "#dashboard" },
		{ name: "Schedule", hash: "#schedule" },
		{ name: "Patients", hash: "#patients" },
		{ name: "Visit", hash: "#visit" },
		{ name: "Imaging", hash: "#imaging" },
		{ name: "Finance", hash: "#finance" },
		{ name: "Settings", hash: "#settings" },
	];

	for (const tab of tabs) {
		console.log(`Navigating to ${tab.name}...`);
		await page.goto(`http://127.0.0.1:5173/${tab.hash}`, {
			waitUntil: "domcontentloaded",
		});
		await page.waitForTimeout(2000); // Allow animations/renders

		// Fullscreen
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.screenshot({
			path: path.join(artifactsDir, `${tab.name.toLowerCase()}_desktop.png`),
			fullPage: true,
		});

		// Mobile / Resize
		await page.setViewportSize({ width: 375, height: 812 });
		await page.waitForTimeout(500); // Allow responsive reflow
		await page.screenshot({
			path: path.join(artifactsDir, `${tab.name.toLowerCase()}_mobile.png`),
			fullPage: true,
		});

		console.log(`Saved screenshots for ${tab.name}`);
	}

	await browser.close();
	console.log("Audit completed.");
})();
