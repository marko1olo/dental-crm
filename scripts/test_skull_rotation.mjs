import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	const mockDashboard = {
		clinicName: "Стоматология ДЕНТЕ Премиум",
		todayIso: "2026-10-03",
		clinicSettings: {
			profile: {
				id: "c-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				clinicName: "Стоматология ДЕНТЕ Премиум",
				mode: "small_clinic",
				defaultVisitMinutes: 45,
				scheduleDefaults: { workingDays: [1, 2, 3, 4, 5, 6], workdayStart: "08:00", workdayEnd: "21:00", appointmentBufferMinutes: 10 },
				timezone: "Europe/Moscow",
				updatedAt: new Date().toISOString(),
			},
			staff: [{ id: "doc-1", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", specialties: ["therapist"], active: true, color: "#0d9488", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
			chairs: [{ id: "chair-1", organizationId: "00000000-0000-0000-0000-000000000001", name: "Кабинет 1", room: "1", defaultDoctorId: "doc-1", active: true }],
		},
		patients: [{ id: "pat-zakharov", organizationId: "00000000-0000-0000-0000-000000000001", fullName: "Захаров Иван Дмитриевич", status: "active", birthDate: "1980-05-15", phone: "+7 (999) 000-11-22", notes: "КЛКТ", administrativeProfile: "normal", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
	};

	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов", role: "owner" } }) });
		}
		if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
		return route.continue();
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2000);

	await page.evaluate(() => {
		document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
	await openMprBtn.click({ force: true });

	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	await loadDemoBtn.waitFor({ state: "visible", timeout: 15000 });
	await loadDemoBtn.click({ force: true });

	await page.locator("[data-testid='cbct-empty-volume-dropzone']").waitFor({ state: "hidden", timeout: 45000 });
	console.log("Volume mounted!");
	await page.waitForTimeout(3000);

	// Switch 4th quadrant to 3D Volume mode
	const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']").first();
	if (await mode3dBtn.isVisible()) {
		await mode3dBtn.click({ force: true });
		await page.waitForTimeout(1000);
	}

	// Maximize 3D Volume Viewport
	const expand3DBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
	if (await expand3DBtn.isVisible()) {
		await expand3DBtn.click({ force: true });
		await page.waitForTimeout(1500);
	}

	const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/test_skull");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

	// Capture default view
	await page.screenshot({ path: path.join(outDir, "skull_default.png") });
	console.log("Saved skull_default.png");

	// Click 'Фас' (Coronal frontal view)
	const fasBtn = page.locator("[data-testid='cbct-btn-orientation-coronal']").first();
	if (await fasBtn.isVisible()) {
		await fasBtn.click({ force: true });
		await page.waitForTimeout(1000);
		await page.screenshot({ path: path.join(outDir, "skull_fas.png") });
		console.log("Saved skull_fas.png");
	}

	// Click 'Профиль' (Sagittal lateral view)
	const profilBtn = page.locator("[data-testid='cbct-btn-orientation-sagittal']").first();
	if (await profilBtn.isVisible()) {
		await profilBtn.click({ force: true });
		await page.waitForTimeout(1000);
		await page.screenshot({ path: path.join(outDir, "skull_profil.png") });
		console.log("Saved skull_profil.png");
	}

	// Click '3/4' (Isometric view)
	const isoBtn = page.locator("[data-testid='cbct-btn-orientation-isometric']").first();
	if (await isoBtn.isVisible()) {
		await isoBtn.click({ force: true });
		await page.waitForTimeout(1000);
		await page.screenshot({ path: path.join(outDir, "skull_3_4.png") });
		console.log("Saved skull_3_4.png");
	}

	await browser.close();
}

main().catch(console.error);
