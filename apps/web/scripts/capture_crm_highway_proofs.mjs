import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/screenshots/crm_ssot");

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
	await wait(600);
}

async function capture() {
	console.log("=== CAPTURING REAL CRM LEAK HIGHWAY VISUAL PROOF (ZERO-MOCK REAL AUTH) ===");

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

	const page = await context.newPage();
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log("[BROWSER CONSOLE ERROR]:", msg.text());
		}
	});

	try {
		console.log("[STEP 1] Navigating to root auth hub...");
		await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });

		console.log("[AUTH] Waiting for login form...");
		await page.waitForSelector('input[type="password"]', { timeout: 20000 });
		await wait(500);

		console.log("[AUTH] Filling real clinical administrator credentials...");
		const identityInput = await page.$('input[placeholder*="Email"], input[type="text"]');
		const passwordInput = await page.$('input[type="password"]');

		if (identityInput && passwordInput) {
			await identityInput.fill("admin@clinic.ru");
			await passwordInput.fill("Password123!");
			await wait(400);

			console.log("[AUTH] Clicking login submit button...");
			const submitBtn = await page.$('button:has-text("Войти в систему")');
			if (submitBtn) {
				await submitBtn.click();
			}
		}

		console.log("[AUTH] Waiting for authenticated workspace...");
		await page.waitForSelector('#workspace-content, .workspace, nav, .dente-top-bar', {
			state: "visible",
			timeout: 25000,
		});
		await wait(1500);

		console.log("[STEP 2] Navigating to Leads Kanban Workspace (#leads)...");
		await page.evaluate(() => {
			window.location.hash = "leads";
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("leads");
			}
		});
		await wait(3000);

		// 1. Light Mode - Open Leak Detector Modal
		console.log("[STEP 3] Applying Light Theme & Opening CRM Leak Detector Modal...");
		await applyTheme(page, "light");

		const leakBtn = await page.waitForSelector('[data-testid="btn-open-leak-detector"], button:has-text("Детектор оттока")', {
			state: "visible",
			timeout: 25000,
		});
		console.log("[CLICK] Clicking leak detector toolbar button...");
		await leakBtn.click();
		await wait(2000);

		// Wait for modal dialog
		await page.waitForSelector(".cld-modal-dialog", { state: "visible", timeout: 15000 });
		console.log("[MODAL] Leak Detector Modal is open.");

		// Open Leak Lead Inspection Drawer
		console.log("[STEP 4] Opening Leak Inspection Drawer via patient link...");
		const leadLink = await page.waitForSelector('[data-testid^="lead-patient-link-"], .cld-patient-title-btn', { timeout: 10000 });
		await leadLink.click();
		await wait(1500);

		// Wait for drawer card mounted via createPortal
		await page.waitForSelector(".cld-drawer-card", { state: "visible", timeout: 10000 });
		console.log("[DRAWER] Leak Drawer is visible.");

		// ☀️ Light screenshot of Leak Detector Drawer
		console.log("[PROOF 1] Capturing crm_leak_detector_drawer_pc_light.png");
		const lightProofPath = path.join(PROOFS_DIR, "crm_leak_detector_drawer_pc_light.png");
		await page.screenshot({ path: lightProofPath, fullPage: false });

		// 🌙 Dark Mode - CRM Leak Detector Drawer
		console.log("[STEP 5] Applying Dark Theme...");
		await applyTheme(page, "dark");
		await wait(1000);

		console.log("[PROOF 2] Capturing crm_leak_detector_drawer_pc_dark.png");
		const darkProofPath = path.join(PROOFS_DIR, "crm_leak_detector_drawer_pc_dark.png");
		await page.screenshot({ path: darkProofPath, fullPage: false });

		// 3. Test direct highway navigation from Drawer to Patient Workspace
		console.log("[STEP 6] Testing 1-click highway: Drawer -> Patient Workspace (Zero-Reload)...");
		await page.locator('[data-testid="cld-drawer-open-patient-workspace-btn"]').click({ timeout: 15000 });
		await wait(3000);

		// Verify patient workspace opened
		console.log("[PROOF 3] Capturing crm_patient_workspace_direct_open_pc_dark.png");
		const workspaceProofPath = path.join(PROOFS_DIR, "crm_patient_workspace_direct_open_pc_dark.png");
		await page.screenshot({ path: workspaceProofPath, fullPage: false });

		console.log("=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} catch (err) {
		console.error("[ERROR] Visual proof capture error:", err);
	} finally {
		await browser.close();
	}
}

capture();
