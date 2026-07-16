const puppeteer = require("puppeteer");
(async () => {
	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox"],
	});
	const page = await browser.newPage();

	await page.setViewport({ width: 1440, height: 900 });

	await page.setRequestInterception(true);
	page.on("request", (req) => {
		if (req.url().includes("/api/dashboard")) {
			req.respond({
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
							organizationId: "1",
							visitId: "v1",
							title: "Test CBCT",
							kind: "cbct",
							sourceKind: "dicom_file",
							sourceName: "Manual",
							status: "available",
							dicomStudyUid: "1.2.3",
							toothCode: "",
							region: "",
							capturedAt: "2026-07-06T00:00:00Z",
							aiSummary: "",
							previewUrl: "",
							viewerUrl: "",
						},
					],
					serviceCatalog: [],
					clinicalRules: [],
					communicationTasks: [],
				}),
			});
		} else {
			req.continue();
		}
	});

	await page.goto("http://127.0.0.1:5173/#imaging", {
		waitUntil: "networkidle0",
		timeout: 15000,
	});
	await new Promise((r) => setTimeout(r, 2000));

	const html = await page.evaluate(() => document.body.innerHTML);
	require("fs").writeFileSync("artifacts/body.html", html);
	console.log("HTML written to artifacts/body.html");
	await browser.close();
})();
