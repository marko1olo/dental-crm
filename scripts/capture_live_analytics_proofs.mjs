/**
 * scripts/capture_live_analytics_proofs.mjs
 * Captures live proof screenshots of Analytics Dashboard with tactile segmented controls
 * and action buttons in 1440x900 viewport (Desktop Light & Dark).
 * Uses real Fastify API + Vite + PostgreSQL 18.
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

const OUT_DIRS = [
	path.join(process.cwd(), "docs/screenshots/inquisition_live"),
	"C:/Users/Admin/.gemini/antigravity/brain/478af925-ee37-452f-8239-cba2b739b39a",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function provisionTestClinic() {
	const uniqueId = Date.now();
	const loginEmail = `analytics-test-${uniqueId}@dente-visual-test.local`;
	const password = "Dente2026!";
	const ownerPin = "123456";

	console.log(`[AUTH] Creating test clinic in live database: ${loginEmail}`);

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: `Стоматология Дент-Премиум ${uniqueId}`,
			email: loginEmail,
			password,
			ownerName: "Д-р Смирнов Алексей Петрович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		const errText = await initRes.text();
		throw new Error(`setup/init failed ${initRes.status}: ${errText}`);
	}

	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		const errText = await unlockRes.text();
		throw new Error(`staff/unlock failed ${unlockRes.status}: ${errText}`);
	}

	const unlockData = await unlockRes.json();
	const staffToken = unlockData.staffToken;
	console.log(`[AUTH] Staff unlocked successfully.`);

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": staffToken,
	};

	// Create a patient so analytics has records
	const pRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Ковалёв Роман Станиславович",
			phone: "+7 (999) 777-66-55",
			birthDate: "1994-03-22",
		}),
	});

	let patientId = null;
	if (pRes.ok) {
		const patient = await pRes.json();
		patientId = patient.id;
		console.log(`[SEED] Real Patient created: ${patientId}`);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: staffToken || initData.clinicToken,
		patientId,
	};
}

async function seedTokensAndGo(page, clinicToken, staffToken, patientId, themeMode) {
	await page.evaluateOnNewDocument(
		(ct, st, pid, tm) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_theme_mode", tm);
			localStorage.setItem("dente_workspace_perspective", "standard");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					selectedPatientId: pid || null,
					onboardingDismissed: true,
					soundNotificationsMuted: false,
				}),
			);
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedSpecialty: "therapist",
					selectedPatientId: pid || null,
					onboardingDismissed: true,
					soundNotificationsMuted: false,
				}),
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({
					state: {
						clinicName: "Стоматология ДЕНТЕ Премиум",
						currentDoctor: { id: "doc-1", fullName: "Д-р Смирнов А. П.", role: "owner" },
						flags: { disableTour: true },
					},
				})
			);
		},
		clinicToken,
		staffToken,
		patientId,
		themeMode,
	);

	await page.goto(`${APP_BASE}/#analytics`, { waitUntil: "domcontentloaded", timeout: 45000 });
	
	// Wait for boot state to detach
	try {
		await page.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 30000 });
	} catch (e) {
		console.log("Boot state wait timeout, checking if retry button is present...");
		const retryBtn = await page.$(".boot-retry-button");
		if (retryBtn) {
			console.log("Clicking boot retry button...");
			await retryBtn.click();
			await new Promise((r) => setTimeout(r, 2000));
		}
	}

	// Remove any tour elements
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
	});

	// Wait for analytics elements
	await page.waitForSelector(".analytics-dashboard-view, .analytics-container, #analytics, .app-shell", { timeout: 30000 });
	await new Promise((r) => setTimeout(r, 1500));

	// Apply theme
	await page.evaluate((mode) => {
		const root = document.documentElement;
		root.setAttribute("data-theme", mode);
		if (mode === "dark") {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
		}
		localStorage.setItem("dente_theme_mode", mode);
		if (window.__useThemeStore && typeof window.__useThemeStore.getState === "function") {
			window.__useThemeStore.getState().setThemeMode(mode);
		}
	}, themeMode);

	await new Promise((r) => setTimeout(r, 800));
}

async function takeScreenshot(page, fileName) {
	const primaryTarget = path.join(OUT_DIRS[0], fileName);
	await page.screenshot({ path: primaryTarget, fullPage: false });

	for (const dir of OUT_DIRS.slice(1)) {
		const dest = path.join(dir, fileName);
		copyFileSync(primaryTarget, dest);
	}

	const stats = statSync(primaryTarget);
	const hash = crypto.createHash("md5").update(readFileSync(primaryTarget)).digest("hex");
	console.log(`[Captured] ${fileName}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`);
	if (stats.size < 40960) {
		console.error(`[FATAL] Screenshot ${fileName} is too small (${stats.size} bytes < 40KB)!`);
		process.exit(1);
	}
}

async function run() {
	console.log("[LAUNCH] Provisioning live clinic for analytics visual proof...");
	const auth = await provisionTestClinic();

	const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security", "--disable-gpu"];
	const launchOptions = {
		headless: true,
		args: launchArgs,
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}

	const browser = await puppeteer.launch(launchOptions);

	try {
		// 1. Desktop Light (1440x900)
		console.log("\n[CAPTURE] proof_analytics_buttons_tactile_light.png (1440x900 Light)...");
		const pageLight = await browser.newPage();
		await pageLight.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
		await seedTokensAndGo(pageLight, auth.clinicToken, auth.staffToken, auth.patientId, "light");
		await takeScreenshot(pageLight, "proof_analytics_buttons_tactile_light.png");
		await pageLight.close();

		// 2. Desktop Dark (1440x900)
		console.log("\n[CAPTURE] proof_analytics_buttons_tactile_dark.png (1440x900 Dark)...");
		const pageDark = await browser.newPage();
		await pageDark.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
		await seedTokensAndGo(pageDark, auth.clinicToken, auth.staffToken, auth.patientId, "dark");
		await takeScreenshot(pageDark, "proof_analytics_buttons_tactile_dark.png");
		await pageDark.close();

		console.log("\n>>> Live Proof Screenshots Captured Successfully! <<<");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
