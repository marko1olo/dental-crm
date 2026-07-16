const puppeteer = require("puppeteer");

(async () => {
	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox"],
	});
	const page = await browser.newPage();

	// Capture console
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log("BROWSER ERROR:", msg.text());
		} else {
			console.log("BROWSER LOG:", msg.text());
		}
	});
	page.on("pageerror", (err) => {
		console.log("BROWSER EXCEPTION:", err.toString());
	});

	await page.setViewport({ width: 1440, height: 900 });

	// Intercept requests
	await page.setRequestInterception(true);
	page.on("request", (interceptedRequest) => {
		const url = interceptedRequest.url();
		if (url.includes("/api/dashboard")) {
			interceptedRequest.respond({
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
						staff: [],
						chairs: [],
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
							phone: "",
							email: "",
							notes: "",
							administrativeProfile: "normal",
							createdAt: "2026-07-06T00:00:00Z",
							updatedAt: "2026-07-06T00:00:00Z",
						},
					],
					patientInsights: [],
					recommendedActions: [],
					appointments: [],
					appointmentReadiness: [],
					scheduleSuggestions: [],
					activeVisit: {
						id: "v1",
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
						createdAt: "2026-07-06T00:00:00Z",
						updatedAt: "2026-07-06T00:00:00Z",
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
		} else {
			interceptedRequest.continue();
		}
	});

	console.log("Navigating to http://127.0.0.1:5173/#imaging");
	await page
		.goto("http://127.0.0.1:5173/#imaging", {
			waitUntil: "networkidle0",
			timeout: 15000,
		})
		.catch((e) => console.log("Goto timeout/error:", e.message));

	await new Promise((r) => setTimeout(r, 2000));
	await page.screenshot({ path: "artifacts/screenshot_imaging_mocked.png" });
	console.log("Screenshot saved to artifacts/screenshot_imaging_mocked.png");

	await browser.close();
})();
