/**
 * scripts/capture_patient_treatment_plan_drawer_proofs.cjs
 *
 * Скрипт захвата Red Team визуальных доказательств:
 * Интеграция конструктора планов лечения в карточку пациента (PatientWorkspaceView).
 * Снимает PC Light и PC Dark (1440x900) открытого PatientTreatmentPlanDrawerModal.
 */

const path = require("path");
const fs = require("fs");
const { launchSafeBrowser } = require("./safe_playwright.cjs");

const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = path.resolve(__dirname, "../proofs");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function provisionRealSession() {
	console.log("[CAPTURE] Provisioning real session via API...");
	let lastErr = null;
	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			const uniqueId = Date.now();
			const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clinicName: "Стоматология ДЕНТЕ Плюс",
					email: `doctor-plan-inquisitor-${uniqueId}@dente.local`,
					password: "Password123!",
					ownerName: "Д-р Смирнов А. В.",
					ownerPin: "1234",
				}),
			});
			if (!initRes.ok) {
				throw new Error(`Init failed: ${await initRes.text()}`);
			}
			const initData = await initRes.json();

			const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": initData.clinicToken,
				},
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
			});
			if (!unlockRes.ok) {
				throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
			}
			const unlockData = await unlockRes.json();

			const headers = {
				"Content-Type": "application/json",
				"x-dente-clinic-token": initData.clinicToken,
				"x-dente-staff-token": unlockData.staffToken,
			};

			// Создаем пациента для карточки
			const pRes = await fetch(`${API_BASE}/api/patients`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					fullName: "Барабаш Сергей Владимирович",
					phone: "+7 (916) 123-45-67",
					birthDate: "1988-04-12",
					gender: "male",
					notes: "Первичный осмотр, комплексное лечение кариеса",
				}),
			});
			if (!pRes.ok) {
				throw new Error(`Patient create failed: ${await pRes.text()}`);
			}
			const pData = await pRes.json();
			console.log(`[CAPTURE] Created real patient: ${pData.id} (${pData.fullName})`);

			return {
				clinicToken: initData.clinicToken,
				staffToken: unlockData.staffToken,
				ownerUserId: initData.ownerUserId,
				patientId: pData.id,
				patientName: pData.fullName,
			};
		} catch (err) {
			lastErr = err;
			console.log(`[CAPTURE] Provisioning attempt ${attempt} failed: ${err.message}. Retrying in 1s...`);
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
	throw lastErr;
}

(async () => {
	let browser = null;
	try {
		const auth = await provisionRealSession();

		console.log("[CAPTURE] Launching Safe Playwright Browser...");
		browser = await launchSafeBrowser({
			headless: true,
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1.5,
		});

		const page = await context.newPage();

		page.on("console", (msg) => {
			console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
		});

		page.on("response", (res) => {
			if (res.status() >= 400) {
				console.log(`[HTTP ${res.status()}]: ${res.url()}`);
			}
		});

		page.on("pageerror", (err) => {
			console.log("[BROWSER PAGE ERROR]:", err.message);
		});

		console.log("[CAPTURE] Navigating to initial page...");
		await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit", timeout: 45000 });

		console.log("[CAPTURE] Injecting auth & patient state into localStorage...");
		await page.evaluate(({ ct, st, uid, pid }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				isDismissedPermanently: true,
				isTourActive: false,
				currentStepIndex: 99,
				completedStepIds: ["all"],
			}));
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, completed: true, version: 1 }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedPatientId: pid,
				onboardingDismissed: true,
			}));
			localStorage.setItem("dente_selected_patient_id", pid);
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			window.location.hash = "#patients";
		}, {
			ct: auth.clinicToken,
			st: auth.staffToken,
			uid: auth.ownerUserId,
			pid: auth.patientId,
		});

		console.log("[CAPTURE] Reloading page with populated auth...");
		await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });

		console.log("[CAPTURE] Waiting for workspace shell or patients panel...");
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы...") && (
				document.querySelector(".workspace-shell") ||
				document.querySelector("#patients") ||
				document.querySelector(".patients-panel")
			);
		}, { timeout: 30000 });

		console.log("[CAPTURE] Workspace shell mounted! Ensuring patient workspace view is ready...");
		// Make sure we are on #patients
		await page.evaluate(() => {
			if (window.location.hash !== "#patients") {
				window.location.hash = "#patients";
			}
		});

		await page.waitForTimeout(1500);

		// Dismiss any tour modal if present
		try {
			const dismissTour = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить")').first();
			if (await dismissTour.isVisible()) {
				console.log("[CAPTURE] Dismissing tour overlay...");
				await dismissTour.click({ force: true });
				await page.waitForTimeout(600);
			}
		} catch (e) {}

		// Ensure patient is selected (auto-selects first patient, but we can click visible element if needed)
		try {
			const visiblePatient = page.locator(`text="${auth.patientName}":visible`).first();
			if (await visiblePatient.isVisible()) {
				console.log("[CAPTURE] Clicking visible patient row...");
				await visiblePatient.click({ force: true });
				await page.waitForTimeout(800);
			}
		} catch (e) {
			console.log("[CAPTURE] Patient row note:", e.message);
		}

		console.log("[CAPTURE] Looking for patient workspace view...");
		await page.waitForSelector(".patient-workspace-view", { timeout: 20000 });
		console.log("[CAPTURE] Patient Workspace detected!");

		// Check buttons inside workspace
		const primaryBtn = await page.$(".patient-workspace-view [data-testid='btn-patient-create-treatment-plan']");
		console.log("[CAPTURE] Found primary plan button:", Boolean(primaryBtn));

		if (primaryBtn) {
			console.log("[CAPTURE] Clicking primary plan button in patient card toolbar...");
			await primaryBtn.click({ force: true });
			await page.waitForTimeout(1000);
		}

		let modalMounted = await page.$("[data-testid='patient-treatment-plan-drawer-modal']");
		if (!modalMounted) {
			console.log("[CAPTURE] Modal not mounted yet, switching to 'Планы лечения' tab...");
			const plansTab = await page.$(".patient-workspace-view [data-testid='tab-patient-plans'], .patient-workspace-view button:has-text('Планы лечения')");
			if (plansTab) {
				await plansTab.click({ force: true });
				await page.waitForTimeout(800);

				const constructorBtn = await page.$(
					".patient-workspace-view [data-testid='btn-create-treatment-plan'], .patient-workspace-view [data-testid='btn-empty-create-plan']"
				);
				console.log("[CAPTURE] Found constructor button in tab:", Boolean(constructorBtn));
				if (constructorBtn) {
					await constructorBtn.click({ force: true });
					await page.waitForTimeout(1000);
				}
			}
		}

		console.log("[CAPTURE] Waiting for PatientTreatmentPlanDrawerModal to mount...");
		try {
			await page.waitForSelector(
				"[data-testid='patient-treatment-plan-drawer-modal']",
				{ timeout: 10000 }
			);
			console.log("[CAPTURE] PatientTreatmentPlanDrawerModal successfully mounted!");
		} catch (e) {
			console.error("[CAPTURE ERROR]: Modal didn't mount in time. Saving debug screenshot...");
			await page.screenshot({ path: path.join(PROOFS_DIR, "debug_before_modal.png") });
			throw e;
		}
		await page.waitForTimeout(1500);

		// Capture PC Light Mode (1440x900)
		console.log("[CAPTURE] Capturing PC Light (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			localStorage.setItem("dente_theme_mode", "light");
		});
		await page.waitForTimeout(800);

		const lightProofPath = path.join(PROOFS_DIR, "patient_workspace_plan_drawer_pc_light_1440x900.png");
		await page.screenshot({ path: lightProofPath, fullPage: false });
		const lightStats = fs.statSync(lightProofPath);
		console.log(`[CAPTURE] Saved PC Light proof: ${lightProofPath} (${Math.round(lightStats.size / 1024)} KB)`);

		// Capture PC Dark Mode (1440x900)
		console.log("[CAPTURE] Capturing PC Dark (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			localStorage.setItem("dente_theme_mode", "dark");
		});
		await page.waitForTimeout(800);

		const darkProofPath = path.join(PROOFS_DIR, "patient_workspace_plan_drawer_pc_dark_1440x900.png");
		await page.screenshot({ path: darkProofPath, fullPage: false });
		const darkStats = fs.statSync(darkProofPath);
		console.log(`[CAPTURE] Saved PC Dark proof: ${darkProofPath} (${Math.round(darkStats.size / 1024)} KB)`);

		console.log("[CAPTURE] SUCCESS! All proofs captured.");

	} catch (err) {
		console.error("[CAPTURE ERROR]:", err);
		process.exit(1);
	} finally {
		if (browser) {
			await browser.close();
		}
	}
})();
