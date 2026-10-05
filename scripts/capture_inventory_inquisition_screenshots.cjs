/**
 * scripts/capture_inventory_inquisition_screenshots.cjs
 *
 * Captures live Playwright screenshots of DENTE Warehouse & Inventory (1440x900)
 * in Light and Dark themes per Mandate 8d and Apple HIG standards:
 * 1. proof_inventory_desktop_light.png (1440x900 PC Light - Main Stock Table)
 * 2. proof_inventory_desktop_dark.png  (1440x900 PC Dark - Main Stock Table)
 * 3. proof_inventory_fefo_light.png    (1440x900 PC Light - FEFO Expiration Batches)
 * 4. proof_inventory_packages_light.png (1440x900 PC Light - 1-Click Packages Accordion)
 *
 * Saves to docs/screenshots/inventory_inquisition/
 * and copies to C:\Users\Admin\.gemini\antigravity\brain\48422dad-5c0f-4de6-8858-ac0a933715d4\
 */

const { chromium } = require("playwright");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const outputDirs = [
	path.resolve(__dirname, "../docs/screenshots/inventory_inquisition"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/48422dad-5c0f-4de6-8858-ac0a933715d4"),
];

for (const dir of outputDirs) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function getLiveClinicLogin() {
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				host: "127.0.0.1",
				port: 4100,
				path: "/api/auth/login",
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			(res) => {
				let body = "";
				res.on("data", (chunk) => (body += chunk));
				res.on("end", () => {
					try {
						const json = JSON.parse(body);
						resolve(json);
					} catch (e) {
						reject(e);
					}
				});
			},
		);
		req.on("error", reject);
		req.write(JSON.stringify({ email: "clinic@example.com", password: "dente2026" }));
		req.end();
	});
}

async function main() {
	console.log("=== CAPTURING LIVE INVENTORY INQUISITION SCREENSHOTS (1440x900) ===");

	const loginData = await getLiveClinicLogin();
	if (!loginData.clinicToken || !loginData.staffToken) {
		throw new Error("Failed to get live clinic and staff tokens from http://127.0.0.1:4100");
	}
	const clinicToken = loginData.clinicToken;
	const staffToken = loginData.staffToken;
	const user = loginData.user;
	const orgId = "00000000-0000-0000-0000-000000000001";
	console.log(`>>> Authenticated with clinic and staff tokens for organization: ${orgId}`);

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

	console.log(`>>> Launching Chromium (executable: ${executablePath || "bundled"})...`);
	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
			isMobile: false,
			hasTouch: false,
		});

		await context.addInitScript(
			({ token, staff, userInfo, organizationId }) => {
				localStorage.setItem("dente_clinic_token", token);
				localStorage.setItem("dente_staff_token", staff);
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_current_doctor_id", userInfo.id);
				localStorage.setItem("dente_active_staff_user", JSON.stringify(userInfo));
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
				localStorage.setItem(
					"dente_clinical_quest_progress_v1",
					JSON.stringify({
						activeTrackId: "solo_doctor",
						currentStepIndex: 0,
						completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043", "cashier_tender_54fz"],
						isTourActive: false,
						isDismissedPermanently: true,
						tracksProgress: {
							solo_doctor: { completed: true, completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043", "cashier_tender_54fz"] },
							reception_admin: { completed: true, completedStepIds: [] },
							imaging_diagnostics: { completed: true, completedStepIds: [] },
						},
					}),
				);
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({
						onboardingDismissed: true,
						onboardingStep: "done",
						version: 1,
					}),
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
						selectedWorkspaceRole: "doctor",
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);
				localStorage.setItem(
					"dente-workspace-profile",
					JSON.stringify({
						state: {
							clinicName: "Демо Клиника DENTE",
							organizationId,
							currentDoctor: { id: userInfo.id, fullName: userInfo.fullName, role: userInfo.role },
							flags: { disableTour: true },
						},
					}),
				);
			},
			{ token: clinicToken, staff: staffToken, userInfo: user, organizationId: orgId },
		);

		const page = await context.newPage();

		// ─── 1. PC LIGHT (1440x900) — Main Stock Table ───
		console.log(">>> Navigating to Inventory (Light Theme 1440x900)...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			localStorage.setItem("dente_theme_mode", "light");
		}).catch(() => {});

		await page.goto("http://127.0.0.1:5173/#inventory", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
		});

		await page.waitForTimeout(3000);
		const currentUrl = page.url();
		console.log("Current URL after navigation:", currentUrl);
		const hasToolbar = await page.$('[role="toolbar"][aria-label="Панель склада материалов"]');
		console.log("Toolbar element found:", !!hasToolbar);
		await page.screenshot({ path: path.join(outputDirs[0], "debug_screen.png") });
		console.log("Saved debug_screen.png");

		// Wait for toolbar and items table
		if (!hasToolbar) {
			const viewButtons = await page.$$eval("button", (btns) => btns.map((b) => b.textContent.trim()).filter(Boolean));
			console.log("Visible button texts on screen:", viewButtons.slice(0, 15));
		}
		await page.waitForSelector('[role="toolbar"][aria-label="Панель склада материалов"]', {
			state: "visible",
			timeout: 10000,
		});
		await page.waitForTimeout(1500);

		await page.evaluate(() => {
			document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone, [data-testid="toast-container"] > *, .global-toast, .toast-notification, [role="alert"]').forEach((el) => el.remove());
		});

		const lightFile = "proof_inventory_desktop_light.png";
		const primaryLightPath = path.join(outputDirs[0], lightFile);
		await page.screenshot({ path: primaryLightPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryLightPath, path.join(outputDirs[i], lightFile));
		}
		const lightStat = fs.statSync(primaryLightPath);
		const lightHash = crypto.createHash("md5").update(fs.readFileSync(primaryLightPath)).digest("hex");
		console.log(`[CAPTURED] ${lightFile} (${(lightStat.size / 1024).toFixed(1)} KB, MD5: ${lightHash})`);

		// ─── 2. PC DARK (1440x900) — Main Stock Table ───
		console.log(">>> Switching to Dark Theme (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
			document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone, [data-testid="toast-container"] > *, .global-toast, .toast-notification, [role="alert"]').forEach((el) => el.remove());
		});
		await page.waitForTimeout(1000);

		const darkFile = "proof_inventory_desktop_dark.png";
		const primaryDarkPath = path.join(outputDirs[0], darkFile);
		await page.screenshot({ path: primaryDarkPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryDarkPath, path.join(outputDirs[i], darkFile));
		}
		const darkStat = fs.statSync(primaryDarkPath);
		const darkHash = crypto.createHash("md5").update(fs.readFileSync(primaryDarkPath)).digest("hex");
		console.log(`[CAPTURED] ${darkFile} (${(darkStat.size / 1024).toFixed(1)} KB, MD5: ${darkHash})`);

		// ─── 3. PC LIGHT (1440x900) — FEFO Batches Subtab ───
		console.log(">>> Switching to FEFO Batches Subtab...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone').forEach((el) => el.remove());
		});
		await page.click('[data-testid="tab-inventory-fefo"]', { force: true });
		await page.waitForTimeout(1200);

		const fefoFile = "proof_inventory_fefo_light.png";
		const primaryFefoPath = path.join(outputDirs[0], fefoFile);
		await page.screenshot({ path: primaryFefoPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryFefoPath, path.join(outputDirs[i], fefoFile));
		}
		const fefoStat = fs.statSync(primaryFefoPath);
		const fefoHash = crypto.createHash("md5").update(fs.readFileSync(primaryFefoPath)).digest("hex");
		console.log(`[CAPTURED] ${fefoFile} (${(fefoStat.size / 1024).toFixed(1)} KB, MD5: ${fefoHash})`);

		// ─── 4. PC LIGHT (1440x900) — 1-Click Packages Accordion & Carpules ───
		console.log(">>> Opening 1-Click Packages Accordion...");
		await page.evaluate(() => {
			document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone').forEach((el) => el.remove());
		});
		await page.click('[data-testid="tab-inventory-items"]', { force: true });
		await page.waitForTimeout(800);
		await page.evaluate(() => {
			document.querySelectorAll('[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone').forEach((el) => el.remove());
		});
		await page.click('[data-testid="btn-toggle-quick-packages"]', { force: true });
		await page.waitForTimeout(1000);

		const packagesFile = "proof_inventory_packages_light.png";
		const primaryPackagesPath = path.join(outputDirs[0], packagesFile);
		await page.screenshot({ path: primaryPackagesPath, fullPage: false });
		for (let i = 1; i < outputDirs.length; i++) {
			fs.copyFileSync(primaryPackagesPath, path.join(outputDirs[i], packagesFile));
		}
		const pkgStat = fs.statSync(primaryPackagesPath);
		const pkgHash = crypto.createHash("md5").update(fs.readFileSync(primaryPackagesPath)).digest("hex");
		console.log(`[CAPTURED] ${packagesFile} (${(pkgStat.size / 1024).toFixed(1)} KB, MD5: ${pkgHash})`);

		console.log("=== ALL INVENTORY SCREENSHOTS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Screenshot capture error:", err);
	process.exit(1);
});
