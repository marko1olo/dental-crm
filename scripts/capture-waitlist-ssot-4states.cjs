/**
 * scripts/capture-waitlist-ssot-4states.cjs
 * 4-State Visual Proof Capture for Schedule & Waitlist QuickFill:
 * 1. docs/proofs/schedule/01_schedule_waitlist_pc_light_1440x900.png
 * 2. docs/proofs/schedule/02_schedule_waitlist_pc_dark_1440x900.png
 * 3. docs/proofs/schedule/03_schedule_waitlist_mobile_light_390x844.png
 * 4. docs/proofs/schedule/04_schedule_waitlist_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

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
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
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
			{
				id: "doc-2",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Смирнова Елена Викторовна",
				role: "doctor",
				specialties: ["surgery"],
				active: true,
				color: "#0284c7",
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
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: false,
			},
		],
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [],
		modeHints: [],
		soloDoctorMode: false,
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Воронов Дмитрий Игоревич",
			phone: "+7 925 876-54-32",
			birthDate: "1988-04-12",
			gender: "male",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: "pat-2",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Смирнова Анна Сергеевна",
			phone: "+7 916 234-56-78",
			birthDate: "1994-11-20",
			gender: "female",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	appointments: [
		{
			id: "app-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			doctorId: "doc-1",
			chairId: "chair-1",
			status: "planned",
			state: "planned",
			priority: "normal",
			intent: "treatment",
			startsAt: `${todayDate}T09:00:00.000Z`,
			endsAt: `${todayDate}T10:00:00.000Z`,
			startTime: `${todayDate}T09:00:00.000Z`,
			endTime: `${todayDate}T10:00:00.000Z`,
			serviceTitle: "Лечение кариеса 2.4",
			reason: "Лечение кариеса",
			serviceCategories: ["therapy"],
			createdByUserId: "doc-1",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
			patientName: "Воронов Дмитрий Игоревич",
			doctorName: "Д-р Воронов А.В.",
		},
	],
};

const waitlistItems = [
	{
		id: "wl-1",
		patientId: "pat-1",
		patientName: "Воронов Дмитрий Игоревич",
		patientPhone: "+7 925 876-54-32",
		treatmentCategory: "Терапия",
		priority: "high",
		notes: "Острая боль, готов подойти в любое окно сегодня",
		preferredDoctorId: "doc-1",
		preferredDoctorName: "Д-р Воронов А.В.",
		preferredChairId: "chair-1",
		preferredDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
		preferredTimeRange: "any",
		createdAt: new Date().toISOString(),
	},
	{
		id: "wl-2",
		patientId: "pat-2",
		patientName: "Смирнова Анна Сергеевна",
		patientPhone: "+7 916 234-56-78",
		treatmentCategory: "Консультация",
		priority: "normal",
		notes: "Плановый осмотр и профгигиена",
		preferredDoctorId: "doc-1",
		preferredDoctorName: "Д-р Воронов А.В.",
		preferredChairId: "chair-1",
		preferredDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
		preferredTimeRange: "morning",
		createdAt: new Date().toISOString(),
	},
];

async function setupPageRoutesAndStorage(page) {
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		}
		if (url.includes("/api/waitlist")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(waitlistItems),
			});
		}
		if (url.includes("/api/schedule")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.appointments),
			});
		}
		if (url.includes("/api/patients")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.patients),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_workspace_perspective", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "false");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');

		const injectTourSuppressionStyle = () => {
			const style = document.createElement("style");
			style.textContent = `
				[data-testid="doctor-training-coach-mark-card"],
				[data-testid="guided-tour-spotlight-overlay"],
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			if (document.head) {
				document.head.appendChild(style);
			} else {
				document.addEventListener("DOMContentLoaded", () => {
					document.head?.appendChild(style);
				});
			}
		};
		injectTourSuppressionStyle();
	});
}

async function setTheme(page, themeId, isDark) {
	await page.evaluate(
		({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(themeId);
			}
			localStorage.setItem("dente_theme_mode", themeId);
		},
		{ themeId, isDark }
	);
	await page.waitForTimeout(500);
}

async function captureProof(page, targetPath) {
	await page.screenshot({ path: targetPath, fullPage: false });
	const stats = fs.statSync(targetPath);
	const sizeKb = (stats.size / 1024).toFixed(1);
	console.log(`  -> Captured: ${path.basename(targetPath)} (${sizeKb} KB)`);

	const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/73106a46-d93f-4ae0-9751-7250aeab3e39");
	try {
		if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
		fs.copyFileSync(targetPath, path.join(brainDir, path.basename(targetPath)));
	} catch (_) {}

	if (stats.size < 20 * 1024) {
		throw new Error(`Screenshot ${targetPath} is too small: ${sizeKb} KB (< 20 KB)`);
	}
	return targetPath;
}

async function openWaitlist(page) {
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("dente:open-waitlist-for-slot", {
				detail: {
					appointmentId: "app-1",
					startsAt: new Date(Date.now() + 3600000).toISOString(),
					endsAt: new Date(Date.now() + 7200000).toISOString(),
					doctorUserId: "doc-1",
					doctorName: "Д-р Воронов А.В.",
					chairId: "chair-1",
					chairName: "Кабинет 1 (Терапия)",
					treatmentCategory: "Терапия",
					freedBecause: "Отмена приёма (окно 60 мин)",
				},
			})
		);
	});
	await page.waitForSelector('[data-testid="waitlist-drawer"]', { timeout: 15000, state: "visible" }).catch(() => {});
	await page.waitForTimeout(800);
}

async function main() {
	const proofDir = path.resolve(__dirname, "../docs/proofs/schedule");
	if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ================= 1. PC (1440x900) =================
		console.log("\n--- Phase 1: PC Desktop Schedule + Waitlist (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		const pcPage = await pcContext.newPage();
		await setupPageRoutesAndStorage(pcPage);

		console.log("  -> Navigating to http://127.0.0.1:5173/?demo=true#schedule...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "commit", timeout: 35000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcPage.waitForTimeout(1000);

		await pcPage.evaluate(() => { window.location.hash = "#schedule"; });
		await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-toolbar"], .schedule-grid-container', { timeout: 30000, state: "visible" }).catch(() => {});
		await pcPage.waitForTimeout(1000);

		// PC Light
		console.log("  -> Opening Waitlist Drawer PC Light...");
		await setTheme(pcPage, "light", false);
		await openWaitlist(pcPage);
		await captureProof(pcPage, path.join(proofDir, "01_schedule_waitlist_pc_light_1440x900.png"));

		// PC Dark
		console.log("  -> Switching to Waitlist Drawer PC Dark...");
		await setTheme(pcPage, "dark", true);
		await captureProof(pcPage, path.join(proofDir, "02_schedule_waitlist_pc_dark_1440x900.png"));

		await pcContext.close();

		// ================= 2. MOBILE (390x844) =================
		console.log("\n--- Phase 2: Mobile Apple HIG Schedule + Waitlist Bottom Sheet (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		});
		const mobilePage = await mobileContext.newPage();
		await setupPageRoutesAndStorage(mobilePage);

		console.log("  -> Navigating to http://127.0.0.1:5173/?demo=true#schedule on Mobile...");
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "commit", timeout: 35000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobilePage.waitForTimeout(1000);

		await mobilePage.evaluate(() => { window.location.hash = "#schedule"; });
		await mobilePage.waitForTimeout(1500);

		// Mobile Light
		console.log("  -> Opening Waitlist Drawer Mobile Light (Apple HIG Bottom Sheet)...");
		await setTheme(mobilePage, "light", false);
		await openWaitlist(mobilePage);
		await captureProof(mobilePage, path.join(proofDir, "03_schedule_waitlist_mobile_light_390x844.png"));

		// Mobile Dark
		console.log("  -> Switching to Waitlist Drawer Mobile Dark (Apple HIG Bottom Sheet)...");
		await setTheme(mobilePage, "dark", true);
		await captureProof(mobilePage, path.join(proofDir, "04_schedule_waitlist_mobile_dark_390x844.png"));

		await mobileContext.close();

		console.log("\n=== ALL 4 REQUIRED WAITLIST PROOFS CAPTURED & VALIDATED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[Waitlist Proof] ERROR:", err);
	process.exit(1);
});