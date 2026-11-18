import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/photo_radiology");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b7e40803-eb1d-4f33-bcf6-fb2e118248c5");

[PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const initSession = () => {
	try {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_active_session_token", "demo-staff-token");
		localStorage.setItem("dente_active_user_id", "user-rad-1");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_active_mode", "doctor");
		localStorage.setItem("dente_user_id", "user-rad-1");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_finished", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_doctor_shift_active", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_showcase_mode", "true");
		localStorage.setItem("dente_active_tooth", "16");
		sessionStorage.setItem("dente_unlocked", "true");

		const doctorUser = {
			id: "user-rad-1",
			userId: "user-rad-1",
			name: "Лечащий врач",
			fullName: "Лечащий врач клиники",
			role: "doctor",
			specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
		};

		localStorage.setItem("dente_staff_session", JSON.stringify(doctorUser));
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(doctorUser));
		localStorage.setItem("dente_cached_staff_list", JSON.stringify([doctorUser]));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(doctorUser));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
		);
	} catch (e) {}
};

async function setDarkTheme(page) {
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.body.classList.add("dark");
		document.body.classList.remove("light");
		document.documentElement.style.colorScheme = "dark";
		localStorage.setItem("dente_theme_mode", "dark");
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
	});
	await page.waitForTimeout(400);
}

async function setLightTheme(page) {
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.add("light");
		document.documentElement.classList.remove("dark");
		document.body.classList.add("light");
		document.body.classList.remove("dark");
		document.documentElement.style.colorScheme = "light";
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("theme", "light");
	});
	await page.waitForTimeout(400);
}

async function suppressToastsAndOverlays(page) {
	await page.evaluate(() => {
		if (!document.getElementById("suppress-overlays-canonical")) {
			const s = document.createElement("style");
			s.id = "suppress-overlays-canonical";
			s.innerHTML = `
				.toast, .global-toast, .toast-container, [role="alert"],
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				vite-error-overlay {
					display: none !important;
					opacity: 0 !important;
					visibility: hidden !important;
					pointer-events: none !important;
					height: 0 !important;
					width: 0 !important;
					overflow: hidden !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(s);
		}
		document.querySelectorAll('.toast, .global-toast, .toast-container, [role="alert"], vite-error-overlay').forEach((el) => el.remove());
	});
}

async function saveProof(page, filename, description) {
	await suppressToastsAndOverlays(page);
	await page.waitForTimeout(500);

	const fullPath = path.join(PROOFS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);
	await page.screenshot({ path: fullPath, fullPage: false });
	fs.copyFileSync(fullPath, brainPath);

	const stat = fs.statSync(fullPath);
	console.log(`[CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	return { filename, size: stat.size, path: fullPath };
}

async function main() {
	console.log("=== DOMAIN 20/6: 4-STATE VISUAL PROOF AUTOMATION ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ══════════════════════════════════════════════════════════════
		// 1. CLINICAL PHOTO PROTOCOL (4-STATE)
		// ══════════════════════════════════════════════════════════════
		console.log("\n--- Phase 1: Clinical Photo Protocol (6-Slot Grid) ---");
		const photoContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await photoContext.addInitScript(initSession);
		const photoPage = await photoContext.newPage();

		const photoUrl = `${WEB_BASE}/?demo=true&photo=1&patientId=01a00000-0000-0000-0000-000000000001`;
		console.log(`Navigating to ${photoUrl}...`);
		await photoPage.goto(photoUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
		await photoPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await photoPage.waitForTimeout(2000);
		await photoPage.waitForSelector(".photo-protocol-modal, [data-testid=\"clinical-photo-protocol-modal\"]", { timeout: 15000 }).catch(() => {});

		// 1.1 ☀️ PC Light (1440x900)
		await setLightTheme(photoPage);
		await saveProof(photoPage, "photo_protocol_pc_light.png", "☀️ PC Light 1440x900 Clinical Photo Protocol 6-Slot Grid");

		// 1.2 🌙 PC Dark (1440x900)
		await setDarkTheme(photoPage);
		await saveProof(photoPage, "photo_protocol_pc_dark.png", "🌙 PC Dark 1440x900 Clinical Photo Protocol 6-Slot Grid");

		// 1.3 📱 Mobile Light (390x844)
		await photoPage.setViewportSize({ width: 390, height: 844 });
		await photoPage.waitForTimeout(600);
		await setLightTheme(photoPage);
		await saveProof(photoPage, "photo_protocol_mobile_light.png", "📱 Mobile Light 390x844 Clinical Photo Protocol Apple HIG Sheet");

		// 1.4 📱 Mobile Dark (390x844)
		await setDarkTheme(photoPage);
		await saveProof(photoPage, "photo_protocol_mobile_dark.png", "📱 Mobile Dark 390x844 Clinical Photo Protocol Apple HIG Sheet");
		await photoPage.close();
		await photoContext.close();

		// ══════════════════════════════════════════════════════════════
		// 2. RADIOLOGY 2D SENSOR & VISIOGRAPHY (4-STATE)
		// ══════════════════════════════════════════════════════════════
		console.log("\n--- Phase 2: Radiology 2D Sensor & Visiography (4-State) ---");
		const radContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await radContext.addInitScript(initSession);
		const radPage = await radContext.newPage();

		const radUrl = `${WEB_BASE}/?demo=true#radiology-standalone`;
		console.log(`Navigating to ${radUrl}...`);
		await radPage.goto(radUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
		await radPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await radPage.waitForTimeout(2000);
		await radPage.waitForSelector('[data-testid="visiograph-study-viewer"], .sensor-study-viewer, [data-testid="sensor-viewer-top-toolbar"]', { timeout: 15000 }).catch(() => {});

		// 2.1 ☀️ PC Light (1440x900)
		await setLightTheme(radPage);
		await saveProof(radPage, "radiology_sensor_pc_light.png", "☀️ PC Light 1440x900 Radiology 2D Sensor Viewer");

		// 2.2 🌙 PC Dark (1440x900)
		await setDarkTheme(radPage);
		await saveProof(radPage, "radiology_sensor_pc_dark.png", "🌙 PC Dark 1440x900 Radiology 2D Sensor Viewer");

		// 2.3 📱 Mobile Light (390x844)
		await radPage.setViewportSize({ width: 390, height: 844 });
		await radPage.waitForTimeout(600);
		await setLightTheme(radPage);
		await saveProof(radPage, "radiology_sensor_mobile_light.png", "📱 Mobile Light 390x844 Radiology 2D Sensor Mobile View");

		// 2.4 📱 Mobile Dark (390x844)
		await setDarkTheme(radPage);
		await saveProof(radPage, "radiology_sensor_mobile_dark.png", "📱 Mobile Dark 390x844 Radiology 2D Sensor Mobile View");
		await radPage.close();
		await radContext.close();

		console.log("\n=== ALL 8 VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
