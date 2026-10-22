import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5174";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/d2c74888-08b1-4d52-b760-2bf3f69bc084/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/chairside_visit_4state";

fs.mkdirSync(OUT_CONV, { recursive: true });
fs.mkdirSync(OUT_DOCS, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		document.body.classList.remove(isDark ? "light" : "dark");
		document.body.classList.add(th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(800);
}

function saveScreenshot(sourceBuf, filename) {
	const convPath = path.join(OUT_CONV, filename);
	const docsPath = path.join(OUT_DOCS, filename);
	fs.writeFileSync(convPath, sourceBuf);
	fs.writeFileSync(docsPath, sourceBuf);
	const hash = crypto.createHash("md5").update(sourceBuf).digest("hex");
	console.log(`[PRODUCED SCREENSHOT] ${filename} | ${(sourceBuf.length / 1024).toFixed(1)} KB | MD5: ${hash}`);
}

async function main() {
	console.log("=== 1. API AUTHENTICATION (LIVE BACKEND) ===");
	const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed with HTTP ${loginRes.status}`);
	}
	const auth = await loginRes.json();
	console.log(`Authenticated as: ${auth.user?.name || "Admin"} (clinicToken: ${Boolean(auth.clinicToken)})`);

	console.log("\n=== 2. LAUNCHING PLAYWRIGHT CHROME ===");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		]);

		await context.addInitScript(({ clinicToken, staffToken, user }) => {
			localStorage.setItem("dente_clinic_token", clinicToken);
			localStorage.setItem("dente_staff_token", staffToken);
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_active_staff_user", JSON.stringify(user || { id: "doc-1", name: "Доктор Терапевт", role: "doctor" }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_sidebar_collapsed", "false");
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}));
		}, {
			clinicToken: auth.clinicToken,
			staffToken: auth.staffToken,
			user: auth.user,
		});

		const page = await context.newPage();

		console.log("Navigating to http://127.0.0.1:5174/#visit...");
		await page.goto(`${APP_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });

		console.log("Waiting for clinical visit screen...");
		await page.waitForSelector('[data-testid="btn-somatic-norm-one-click"], [data-testid="visit-view"], .visit-layout, .visit-view', {
			state: "visible",
			timeout: 35000,
		});
		console.log("Visit workspace verified mounted on DOM.");

		// Dismiss any modal or overlay
		await page.keyboard.press("Escape");
		await wait(500);

		// 1. PC Light (1440x900)
		console.log("\n>>> Capturing PC Light (1440x900)...");
		await applyTheme(page, "light");
		await wait(1200);
		const bufPcLight = await page.screenshot({ fullPage: false, animations: "disabled" });
		saveScreenshot(bufPcLight, "pc_light_1440x900.png");

		// 2. PC Dark (1440x900)
		console.log("\n>>> Capturing PC Dark (1440x900)...");
		await applyTheme(page, "dark");
		await wait(1200);
		const bufPcDark = await page.screenshot({ fullPage: false, animations: "disabled" });
		saveScreenshot(bufPcDark, "pc_dark_1440x900.png");

		// 3. Mobile Dark (390x844)
		console.log("\n>>> Capturing Mobile Dark (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await wait(1500);
		await page.keyboard.press("Escape");
		await wait(500);
		const bufMobileDark = await page.screenshot({ fullPage: false, animations: "disabled" });
		saveScreenshot(bufMobileDark, "mobile_dark_390x844.png");

		// 4. Mobile Light (390x844)
		console.log("\n>>> Capturing Mobile Light (390x844)...");
		await applyTheme(page, "light");
		await wait(1200);
		await page.keyboard.press("Escape");
		await wait(500);
		const bufMobileLight = await page.screenshot({ fullPage: false, animations: "disabled" });
		saveScreenshot(bufMobileLight, "mobile_light_390x844.png");

		console.log("\n=== ALL 4 STATES CAPTURED FLAWLESSLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
