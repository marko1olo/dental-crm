/**
 * scripts/capture_treatment_plans.cjs
 *
 * Full, robust capture of Treatment Plans & Estimates in PC Light and Dark modes.
 * Uses safe_playwright.cjs to respect RAM caps and avoid zombie browser processes.
 */

const path = require("path");
const fs = require("fs");
const { launchSafeBrowser } = require("./safe_playwright.cjs");

const SCREENSHOTS_DIR = path.resolve(__dirname, "../artifacts/screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
	let browser = null;
	try {
		console.log("[CAPTURE] Launching Safe Playwright Browser...");
		browser = await launchSafeBrowser({
			headless: true,
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1.5,
		});

		const page = await context.newPage();

		page.on("pageerror", (err) => {
			console.log("[BROWSER PAGE ERROR]:", err.message);
		});

		// Mock APIs exactly as in playwright-audit.cjs
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/api/dashboard")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						clinicName: "Стоматология Дент-Премиум",
						todayIso: "2026-10-06",
						clinicSettings: {
							profile: {
								id: "1",
								clinicName: "Стоматология Дент-Премиум",
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
									id: "01a00000-0000-0000-0003-000000000001",
									fullName: "Д-р Смирнов А.П.",
									role: "doctor",
									specialties: ["therapist", "orthopedist"],
									active: true,
								},
							],
							chairs: [
								{
									id: "chair1",
									name: "Кабинет 1",
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
								title: "Соло-кабинет",
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
								fullName: "Барабаш Сергей Владимирович",
								birthDate: "1988-04-12",
								phone: "+7 (916) 123-45-67",
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
								doctorUserId: "01a00000-0000-0000-0003-000000000001",
								chairId: "chair1",
								state: "in_progress",
								priority: "normal",
								intent: "treatment",
								startsAt: "2026-10-06T10:00:00Z",
								endsAt: "2026-10-06T11:00:00Z",
								serviceCategories: [],
								createdByUserId: "01a00000-0000-0000-0003-000000000001",
								createdAt: "2026-10-06T09:00:00Z",
								updatedAt: "2026-10-06T09:00:00Z",
								patientName: "Барабаш Сергей Владимирович",
								doctorName: "Д-р Смирнов А.П.",
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
							complaint: "Консультация и составление комплексного плана",
							anamnesis: "Соматически здоров",
							objectiveStatus: null,
							diagnosis: "К02.1 Кариес дентина",
							treatmentPlan: null,
							doctorSummary: null,
							createdAt: "2026-10-06T10:00:00Z",
							updatedAt: "2026-10-06T10:00:00Z",
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
						id: "p1",
						organizationId: "1",
						status: "active",
						fullName: "Барабаш Сергей Владимирович",
						birthDate: "1988-04-12",
						phone: "+7 (916) 123-45-67",
						email: "",
						notes: "",
						administrativeProfile: "normal",
						createdAt: "2026-07-06T00:00:00Z",
						updatedAt: "2026-07-06T00:00:00Z",
					}),
				});
			} else if (url.includes("/api/auth/staff/unlock")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						staffToken: "mock_staff_token_123",
						user: {
							id: "doctor1",
							fullName: "Д-р Смирнов А.П.",
							role: "doctor",
							organizationId: "1",
							email: "doctor@dente.ru",
						},
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

		console.log("[CAPTURE] Navigating to http://127.0.0.1:5173/...");
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
			localStorage.setItem("dente_workspace_perspective", "presentation");
			localStorage.setItem("dente_current_view", "visit");
		});

		console.log("[CAPTURE] Reloading with applied storage...");
		await page.reload({ waitUntil: "domcontentloaded" });

		// Handle Boot Unlock Form if appears
		try {
			await page.waitForSelector('.boot-unlock-form input[type="password"]', { timeout: 2000 });
			console.log("[CAPTURE] Unlocking boot screen...");
			await page.fill('.boot-unlock-form input[type="password"]', "dente123");
			await page.click('.boot-unlock-form button[type="submit"]');
			await page.waitForTimeout(1000);
		} catch (e) {
			console.log("[CAPTURE] No boot unlock screen.");
		}

		// Handle StaffPinPad if appears
		try {
			console.log("[CAPTURE] Checking for StaffPinPad...");
			const zeroBtn = await page.waitForSelector('.auth-pin-btn:has-text("0")', { timeout: 3000 });
			if (zeroBtn) {
				console.log("[CAPTURE] Entering PIN 0000 on PinPad...");
				for (let i = 0; i < 4; i++) {
					await zeroBtn.click();
					await page.waitForTimeout(150);
				}
				await page.waitForTimeout(1200);
			}
		} catch (e) {
			console.log("[CAPTURE] No StaffPinPad found or error:", e.message);
		}

		// Wait for workspace or treatment module
		console.log("[CAPTURE] Waiting for workspace...");
		try {
			await page.waitForSelector(".workspace, .treatment-plan-module, #visit", { timeout: 10000 });
		} catch (e) {
			console.log("[CAPTURE] Timeout waiting for workspace, dumping debug state...");
			const debugPath = path.join(SCREENSHOTS_DIR, "debug_current_state.png");
			await page.screenshot({ path: debugPath });
			fs.writeFileSync(path.join(SCREENSHOTS_DIR, "debug_current_state.html"), await page.content());
			console.log(`[CAPTURE] Saved debug screenshot to ${debugPath}`);
			throw e;
		}
		// Dismiss any onboarding popups if present
		try {
			await page.keyboard.press("Escape");
			await page.waitForTimeout(200);
			for (let i = 0; i < 3; i++) {
				const skipBtn = await page.$(
					'button:has-text("Пропустить Далее"), button:has-text("Пропустить"), button:has-text("Понятно, я сам"), button:has-text("Больше не показывать")'
				);
				if (skipBtn) {
					console.log("[CAPTURE] Dismissing onboarding modal...");
					await skipBtn.click({ force: true });
					await page.waitForTimeout(400);
				}
			}
		} catch (e) {}

		// Navigate into Visit / Treatment Plan view
		console.log("[CAPTURE] Navigating into Visit / Treatment Plan view...");
		await page.evaluate(() => {
			localStorage.setItem("dente_workspace_perspective", "presentation");
			if (window.__usePerspectiveStore) {
				window.__usePerspectiveStore.getState().setPerspective("presentation");
			}
			window.location.hash = "visit";
		});
		await page.waitForTimeout(2000);

		// If visit view still not active, click openCardBtn
		try {
			const openCardBtn = await page.$('button:has-text("Открыть карту / Прием")');
			if (openCardBtn) {
				console.log("[CAPTURE] Clicking 'Открыть карту / Прием' button...");
				await openCardBtn.click({ force: true });
				await page.waitForTimeout(2000);
			}
		} catch (e) {}

		// Wait for TreatmentPlanModule
		console.log("[CAPTURE] Waiting for treatment plan module...");
		await page.waitForSelector(
			".treatment-plan-module, [data-testid='treatment-plan-module'], .plan-comparison-container, [data-testid='visit-view']",
			{ timeout: 12000 }
		);
		console.log("[CAPTURE] Treatment Plan UI detected successfully!");
		await page.waitForTimeout(1000);

		// Dismiss any lingering tour popups on visit
		try {
			await page.keyboard.press("Escape");
			await page.waitForTimeout(200);
			for (let i = 0; i < 3; i++) {
				const skipBtn = await page.$(
					'button:has-text("Понятно, я сам"), button:has-text("Больше не показывать"), button:has-text("Пропустить Далее"), button:has-text("Пропустить")'
				);
				if (skipBtn) {
					console.log("[CAPTURE] Clicking tour skip button...");
					await skipBtn.click({ force: true });
					await page.waitForTimeout(400);
				}
			}
		} catch (e) {}

		// Switch to Light Theme
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await page.waitForTimeout(600);

		const lightPath = path.join(SCREENSHOTS_DIR, "treatment_plans_light_1440x900.png");
		await page.screenshot({ path: lightPath, fullPage: false });
		console.log(`[CAPTURE] Saved Clean Light Screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);

		// Switch to Dark Theme for Treatment Plan Module
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await page.waitForTimeout(600);

		const darkPath = path.join(SCREENSHOTS_DIR, "treatment_plans_dark_1440x900.png");
		await page.screenshot({ path: darkPath, fullPage: false });
		console.log(`[CAPTURE] Saved Clean Dark Screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);

		// Switch back to Light Theme before opening Presenter Modal
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await page.waitForTimeout(400);

		// Open Presenter Modal
		console.log("[CAPTURE] Looking for Presenter button in Options menu...");
		const optionsBtn = await page.$('button:has-text("Опции")');
		if (optionsBtn) {
			console.log("[CAPTURE] Opening Options menu...");
			await optionsBtn.click();
			await page.waitForTimeout(500);
			const presenterItem = await page.$(
				'button:has-text("Презентация планов"), [role="menuitem"]:has-text("Презентация")'
			);
			if (presenterItem) {
				console.log("[CAPTURE] Clicking 'Презентация планов' item...");
				await presenterItem.click();
				await page.waitForTimeout(1500);
			}
		}

		let presenterOpened = Boolean(await page.$('.treatment-presenter-modal, .treatment-presenter-header'));
		if (presenterOpened) {
			console.log("[CAPTURE] Presenter modal detected, capturing light presenter...");
			const presenterLightPath = path.join(SCREENSHOTS_DIR, "treatment_presenter_light_1440x900.png");
			await page.screenshot({ path: presenterLightPath, fullPage: false });
			console.log(
				`[CAPTURE] Saved Presenter Light Screenshot: ${presenterLightPath} (${fs.statSync(presenterLightPath).size} bytes)`
			);

			// Dark theme presenter
			await page.evaluate(() => {
				document.documentElement.classList.add("dark");
				document.documentElement.setAttribute("data-theme", "dark");
				localStorage.setItem("dente_theme", "dark");
			});
			await page.waitForTimeout(600);

			const presenterDarkPath = path.join(SCREENSHOTS_DIR, "treatment_presenter_dark_1440x900.png");
			await page.screenshot({ path: presenterDarkPath, fullPage: false });
			console.log(
				`[CAPTURE] Saved Presenter Dark Screenshot: ${presenterDarkPath} (${fs.statSync(presenterDarkPath).size} bytes)`
			);

			// Close presenter cleanly
			const closeBtn = await page.$('[data-testid="close-treatment-presenter-btn"], .treatment-presenter-close-btn');
			if (closeBtn) {
				await closeBtn.click();
				await page.waitForTimeout(500);
			}
		}

		console.log("[CAPTURE] SUCCESS: All screenshots captured!");
	} catch (err) {
		console.error("[CAPTURE ERROR]:", err);
		process.exitCode = 1;
	} finally {
		if (browser) {
			await browser.close();
		}
	}
})();
