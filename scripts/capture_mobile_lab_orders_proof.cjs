const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: todayDate,
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			hasPediatricMode: true,
			timezone: "Europe/Moscow",
			phone: "+7 (495) 123-45-67",
			address: "Москва, Столярный переулок, 14",
			inn: "7701234567",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "orthopedist"],
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
				name: "Кабинет 1 (Терапия)",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
			},
		],
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [],
		modeHints: [],
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Барабаш Сергей Владимирович",
			status: "active",
			phone: "+7 (999) 450-23-11",
		},
	],
	appointments: [],
	payments: [],
};

const demoLabOrders = [
	{
		id: "demo-ztl-1",
		orderNumber: "ЗТЛ-2026-101",
		patientId: "pat-1",
		patientName: "Барабаш С.В.",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А.В.",
		labName: "CAD/CAM Центр Дентал-Мастер",
		technicianName: "Техник Соколов М.",
		toothFdi: "2.6",
		selectedTeeth: [26],
		constructionType: "Коронка цирконий",
		material: "Диоксид циркония Katana HTML",
		colorVita: "A2",
		status: "in_progress",
		currentStage: "framework_fitting",
		dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
		scheduledVisitDate: new Date(Date.now() + 1 * 86400000).toISOString(),
		priceRub: 24000,
		labPhone: "+7 (999) 450-23-11",
	},
	{
		id: "demo-ztl-2",
		orderNumber: "ЗТЛ-2026-102",
		patientId: "pat-2",
		patientName: "Смирнова Е.А.",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А.В.",
		labName: "ArtDent Премиум Лаб",
		technicianName: "Техник Васильев А.",
		toothFdi: "1.1, 2.1",
		selectedTeeth: [11, 21],
		constructionType: "Виниры E.max",
		material: "IPS e.max Press",
		colorVita: "BL2",
		status: "ready_in_clinic",
		currentStage: "ready_in_clinic",
		dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
		scheduledVisitDate: new Date(Date.now() + 1 * 86400000).toISOString(),
		priceRub: 56000,
		labPhone: "+7 (916) 320-11-88",
	},
	{
		id: "demo-ztl-3",
		orderNumber: "ЗТЛ-2026-103",
		patientId: "pat-3",
		patientName: "Кузнецов И.П.",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А.В.",
		labName: "ZirconLab Pro",
		technicianName: "Техник Григорьев Д.",
		toothFdi: "4.5–4.7",
		selectedTeeth: [45, 46, 47],
		constructionType: "Мостовидный протез",
		material: "ZrO2 Prettau 3 ед.",
		colorVita: "A3",
		status: "fitting",
		currentStage: "ceramic_layering",
		dueDate: new Date().toISOString(),
		scheduledVisitDate: new Date().toISOString(),
		priceRub: 72000,
		labPhone: "+7 (925) 555-12-34",
	},
	{
		id: "demo-ztl-4",
		orderNumber: "ЗТЛ-2026-104",
		patientId: "pat-4",
		patientName: "Лебедев К.М.",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А.В.",
		labName: "CAD/CAM Центр Дентал-Мастер",
		technicianName: "Техник Соколов М.",
		toothFdi: "3.6",
		selectedTeeth: [36],
		constructionType: "Коронка E.max",
		material: "IPS e.max Press",
		colorVita: "A1",
		status: "completed",
		currentStage: "patient_fixation",
		dueDate: new Date(Date.now() - 3 * 86400000).toISOString(),
		priceRub: 28000,
		labPhone: "+7 (999) 450-23-11",
	},
];

const targetDirs = [path.resolve("docs/screenshots/inquisition_live")];

for (const dir of targetDirs) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
if (!fs.existsSync(brainDir)) {
	fs.mkdirSync(brainDir, { recursive: true });
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		try {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
		} catch (_) {}
	}, theme);
	const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
	await page
		.waitForFunction(
			(dark) => document.documentElement.classList.contains("dark") === dark,
			isDark,
			{ timeout: 5000 },
		)
		.catch(() => {});
	await page.waitForTimeout(400);
}

async function saveProof(page, fileName) {
	for (const dir of targetDirs) {
		const fullPath = path.join(dir, fileName);
		await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
		console.log(`Saved screenshot: ${fullPath} (${fs.statSync(fullPath).size} bytes)`);
	}
	const brainPath = path.join(brainDir, fileName);
	fs.copyFileSync(path.join(targetDirs[0], fileName), brainPath);
	console.log(`Copied to brain: ${brainPath}`);
}

async function main() {
	console.log("=== PLAYWRIGHT CAPTURE: MOBILE DENTAL LAB ORDERS TIMELINE (APPLE HIG) ===");

	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
		});

		await context.addInitScript(() => {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_session_token", "audit-token-staff");
			localStorage.setItem("dente_active_user_id", "doc-1");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente_chunk_reload_/", "1");
			document.cookie = "dente_clinic_token=audit-token-clinic; path=/;";
			document.cookie = "dente_staff_token=audit-token-staff; path=/;";

			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_onboarding_dismissed", "true");
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
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
						currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
						flags: { disableTour: true, hasPediatricMode: true },
					},
				}),
			);
		});

		const page = await context.newPage();

		await page.route("**/*fonts.googleapis.com/**", (route) => route.abort());
		await page.route("**/*fonts.gstatic.com/**", (route) => route.abort());

		// Intercept API routes to boot cleanly without waiting on network
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/src/")) return route.continue();

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
							active: true,
							organizationId: "00000000-0000-0000-0000-000000000001",
						},
					}),
				});
			}

			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						token: "audit-token-staff",
						user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
					}),
				});
			}

			if (url.includes("/api/clinical/lab-orders") || url.includes("/api/lab/orders")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(demoLabOrders),
				});
			}

			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
			});
		});

		const port = 5174;
		console.log(`Navigating to http://127.0.0.1:${port}/?demo=true#lab...`);
		await page.goto(`http://127.0.0.1:${port}/?demo=true#lab`, { waitUntil: "domcontentloaded", timeout: 30000 });

		// Wait for boot-state to disappear
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

		// Remove any obstructive overlays
		await page.evaluate(() => {
			document.querySelectorAll(
				'.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover'
			).forEach((el) => el.remove());
		});

		// Wait for mobile lab orders timeline
		console.log("Waiting for mobile lab orders timeline view...");
		await page.waitForSelector('[data-testid="mobile-lab-orders-timeline-view"], .mobile-lab-container', {
			state: "visible",
			timeout: 25000,
		});
		await page.waitForTimeout(1000);

		// Horizontal scroll check on 390px
		const scrollCheck = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		}));
		console.log(`[SCROLL-CHECK] scrollWidth: ${scrollCheck.scrollWidth}, clientWidth: ${scrollCheck.clientWidth}`);
		if (scrollCheck.scrollWidth > scrollCheck.clientWidth) {
			console.error(`[FAIL] Parasitic horizontal scroll: +${scrollCheck.scrollWidth - scrollCheck.clientWidth}px`);
		} else {
			console.log("[PASS] ZERO PARASITIC SCROLL CONFIRMED: 0px drift!");
		}

		async function captureForTheme(th, fileName) {
			console.log(`Configuring theme: ${th}...`);
			await page.evaluate((themeMode) => {
				localStorage.setItem("dente_theme_mode", themeMode);
				localStorage.setItem("dente_theme", themeMode);
				document.documentElement.setAttribute("data-theme", themeMode);
				const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(themeMode);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(themeMode);
				}
			}, th);

			await page.waitForTimeout(500);

			// Check if boot state appeared; if so, wait for it to detach
			const hasBoot = await page.$(".boot-state");
			if (hasBoot) {
				console.log("Boot state present, waiting for it to detach...");
				await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
			}

			// Ensure .mobile-lab-container is visible
			await page.waitForSelector(".mobile-lab-container", { state: "visible", timeout: 15000 });

			// Remove overlays
			await page.evaluate(() => {
				document.querySelectorAll(
					'.sa-toast, [data-testid="global-toast"], .onboarding-compact-strip, .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .default-clinic-banner, .tour-tooltip, .driver-overlay, .driver-popover'
				).forEach((el) => el.remove());
			});

			await page.waitForTimeout(600);
			await saveProof(page, fileName);
		}

		// 1. Capture Mobile Light Timeline
		console.log("Capturing 1. proof_mobile_lab_orders_light.png ...");
		await captureForTheme("light", "proof_mobile_lab_orders_light.png");

		// Open Bottom Sheet in Light Mode
		console.log("Opening Bottom Sheet in Light Mode...");
		await page.locator('[data-testid="mobile-lab-order-card-demo-ztl-1"]').click();
		await page.waitForSelector(".mobile-lab-sheet-surface", { state: "visible", timeout: 8000 });
		await page.waitForTimeout(400);
		await saveProof(page, "proof_mobile_lab_orders_sheet_light.png");
		await page.locator(".mobile-lab-sheet-close").click();
		await page.waitForSelector(".mobile-lab-sheet-surface", { state: "hidden", timeout: 8000 });
		await page.waitForTimeout(300);

		// 2. Capture Mobile Dark Timeline
		console.log("Capturing 2. proof_mobile_lab_orders_dark.png ...");
		await captureForTheme("dark", "proof_mobile_lab_orders_dark.png");

		// Open Bottom Sheet in Dark Mode
		console.log("Opening Bottom Sheet in Dark Mode...");
		await page.locator('[data-testid="mobile-lab-order-card-demo-ztl-1"]').click();
		await page.waitForSelector(".mobile-lab-sheet-surface", { state: "visible", timeout: 8000 });
		await page.waitForTimeout(400);
		await saveProof(page, "proof_mobile_lab_orders_sheet_dark.png");
		await page.locator(".mobile-lab-sheet-close").click();
		await page.waitForSelector(".mobile-lab-sheet-surface", { state: "hidden", timeout: 8000 });
		await page.waitForTimeout(300);

		console.log("=== ALL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
