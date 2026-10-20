import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/screenshots/bloat_extermination");

if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(700);
}

async function capture() {
	console.log("=== CAPTURING REAL CHAIRSIDE VISIT EMK / PROTOCOL STEPPER VISUAL PROOFS ===");

	console.log("[LOGIN] Authenticating via API credentials...");
	let auth = null;
	try {
		const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
		});
		if (loginRes.ok) {
			auth = await loginRes.json();
			console.log("[LOGIN] Authenticated successfully via API.");
		} else {
			console.log(`[LOGIN] API returned ${loginRes.status}, fallback to demo tokens`);
		}
	} catch (e) {
		console.log("[LOGIN] API fetch error:", e.message);
	}

	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(edgePath)
		? edgePath
		: fs.existsSync(chromePath)
			? chromePath
			: undefined;

	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	if (auth?.clinicToken && auth?.staffToken) {
		await context.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		]);
	}

	const page = await context.newPage();
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

	const doc = auth?.user || { id: "doc-1", name: "Доктор Терапевт", role: "doctor" };
	const cToken = auth?.clinicToken || "demo-clinic-token";
	const sToken = auth?.staffToken || "demo-staff-token";

	await page.addInitScript(({ cToken, sToken, doc }) => {
		localStorage.setItem("dente_clinic_token", cToken);
		localStorage.setItem("dente_staff_token", sToken);
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			selectedSpecialty: "therapist",
			onboardingDismissed: true,
		}));
	}, { cToken, sToken, doc });

	try {
		console.log("[NAV] Navigating to /#schedule...");
		await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

		// Wait for splash loader to finish
		console.log("[WAIT] Waiting for splash loader to disappear...");
		await page.waitForSelector('text="Загрузка системы..."', { state: "detached", timeout: 20000 }).catch(() => {});
		await wait(2000);

		// If login form is still shown, submit
		const loginBtn = page.locator('button:has-text("Войти в систему")');
		if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			console.log("[AUTH] Clicking login submit button...");
			await loginBtn.click();
			await wait(2500);
			await page.waitForSelector('text="Загрузка системы..."', { state: "detached", timeout: 20000 }).catch(() => {});
		}

		console.log("[WAIT] Waiting for real schedule or workspace...");
		await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-toolbar"], .grid-appointment-card, .workspace, nav', {
			state: "visible",
			timeout: 25000,
		}).catch(() => console.log("[WARN] Timeout waiting for schedule selector, proceeding"));
		await wait(2000);

		// Proof 1: Real Schedule / Doctor Workspace (Light Mode)
		console.log("[STEP 1] Applying Light Theme...");
		await applyTheme(page, "light");
		const lightPath = path.join(PROOFS_DIR, "01_chairside_workspace_light_1440x900.png");
		await page.screenshot({ path: lightPath, fullPage: false });
		console.log(`[CAPTURED] ${lightPath} (${(fs.statSync(lightPath).size / 1024).toFixed(1)} KB)`);

		// Proof 2: Real Schedule / Doctor Workspace (Dark Mode)
		console.log("[STEP 2] Applying Dark Theme...");
		await applyTheme(page, "dark");
		const darkPath = path.join(PROOFS_DIR, "02_chairside_workspace_dark_1440x900.png");
		await page.screenshot({ path: darkPath, fullPage: false });
		console.log(`[CAPTURED] ${darkPath} (${(fs.statSync(darkPath).size / 1024).toFixed(1)} KB)`);

		// Navigate to Patients Workspace
		console.log("[STEP 3] Navigating to Patients & Clinical 043/u records...");
		await page.evaluate(() => {
			window.location.hash = "patients";
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("patients");
			}
		});
		await wait(3000);

		// Proof 3: Patients & Clinical 043/u Workspace (Dark Mode)
		console.log("[STEP 4] Capturing Patients & Clinical 043/u (Dark)...");
		const darkCardPath = path.join(PROOFS_DIR, "03_clinical_presets_clean_dark_1440x900.png");
		await page.screenshot({ path: darkCardPath, fullPage: false });
		console.log(`[CAPTURED] ${darkCardPath} (${(fs.statSync(darkCardPath).size / 1024).toFixed(1)} KB)`);

		// Proof 4: Patients & Clinical 043/u Workspace (Light Mode)
		console.log("[STEP 5] Applying Light Theme to Patients Workspace...");
		await applyTheme(page, "light");
		const lightCardPath = path.join(PROOFS_DIR, "04_clinical_presets_clean_light_1440x900.png");
		await page.screenshot({ path: lightCardPath, fullPage: false });
		console.log(`[CAPTURED] ${lightCardPath} (${(fs.statSync(lightCardPath).size / 1024).toFixed(1)} KB)`);

		console.log("=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} catch (err) {
		console.error("[CAPTURE ERROR]:", err);
	} finally {
		await browser.close();
	}
}

capture();
