const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const OUT_DIR = path.join(__dirname, "../docs/proofs/audit");
const PROOFS_DIR = path.join(__dirname, "../apps/web/public/proofs");

for (const d of [OUT_DIR, PROOFS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

function calculateMd5(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash("md5").update(content).digest("hex");
}

async function clearToasts(page) {
	await page.evaluate(() => {
		document.querySelectorAll('.toast, [role="alert"], [data-testid="global-toast"]').forEach(el => el.remove());
	});
}

async function copyToProofs(fileName) {
	const src = path.join(OUT_DIR, fileName);
	const dst = path.join(PROOFS_DIR, fileName);
	if (fs.existsSync(src)) {
		fs.copyFileSync(src, dst);
		console.log(`Copied to proofs: ${fileName}`);
	}
}

async function capture() {
	console.log("Launching Chromium for Doctor Shift Cockpit & Header exact audit (Defect 3 & 6 Fix)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const capturedFiles = [];

	try {
		// 1. PC Viewport (1440x900, DPR: 2)
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		const pcPage = await pcContext.newPage();

		// Set initial localStorage state for doctor role
		await pcPage.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_clinic_token", "mock_clinic_token");
			localStorage.setItem("dente_staff_token", "mock_staff_token");
			localStorage.setItem("dente_active_session_token", "mock-session-token");
			localStorage.setItem("dente_organization_id", "c-1");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});

		// 1.1 PC Header Light
		console.log("Navigating to Doctor Desktop Header (PC Light)...");
		await pcPage.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "networkidle", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="doctor-desktop-header"]', { timeout: 15000 });
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await pcPage.waitForTimeout(600);
		await clearToasts(pcPage);

		await pcPage.waitForSelector('[data-testid="doctor-desktop-header"]', { state: "visible", timeout: 15000 });
		const headerElLight = await pcPage.$('[data-testid="doctor-desktop-header"]');
		if (!headerElLight) {
			throw new Error("Selector [data-testid=\"doctor-desktop-header\"] not found for pc_light!");
		}
		await headerElLight.scrollIntoViewIfNeeded();
		const headerLightPath = path.join(OUT_DIR, "38_doctor_desktop_header_pc_light.png");
		await headerElLight.screenshot({ path: headerLightPath });
		console.log("Captured: 38_doctor_desktop_header_pc_light.png");
		await copyToProofs("38_doctor_desktop_header_pc_light.png");
		capturedFiles.push("38_doctor_desktop_header_pc_light.png");

		// 1.2 PC Header Dark
		console.log("Switching to Doctor Desktop Header (PC Dark)...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await pcPage.waitForTimeout(600);
		await clearToasts(pcPage);

		await pcPage.waitForSelector('[data-testid="doctor-desktop-header"]', { state: "visible", timeout: 15000 });
		const headerElDark = await pcPage.$('[data-testid="doctor-desktop-header"]');
		if (!headerElDark) {
			throw new Error("Selector [data-testid=\"doctor-desktop-header\"] not found for pc_dark!");
		}
		await headerElDark.scrollIntoViewIfNeeded();
		const headerDarkPath = path.join(OUT_DIR, "38_doctor_desktop_header_pc_dark.png");
		await headerElDark.screenshot({ path: headerDarkPath });
		console.log("Captured: 38_doctor_desktop_header_pc_dark.png");
		await copyToProofs("38_doctor_desktop_header_pc_dark.png");
		capturedFiles.push("38_doctor_desktop_header_pc_dark.png");

		// 1.3 PC Modal Light
		console.log("Navigating to Doctor Shift Cockpit Modal (PC Light)...");
		await pcPage.goto("http://127.0.0.1:5173/?modal=doctor_shift_cockpit#clinical-modals-studio", { waitUntil: "networkidle", timeout: 30000 });
		await pcPage.waitForSelector('[data-testid="doctor-shift-cockpit-modal"]', { state: "visible", timeout: 15000 });
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await pcPage.waitForTimeout(800);
		await clearToasts(pcPage);

		const modalLightPath = path.join(OUT_DIR, "38_doctor_shift_cockpit_pc_light.png");
		await pcPage.screenshot({
			path: modalLightPath,
			fullPage: false,
		});
		console.log("Captured: 38_doctor_shift_cockpit_pc_light.png");
		await copyToProofs("38_doctor_shift_cockpit_pc_light.png");
		capturedFiles.push("38_doctor_shift_cockpit_pc_light.png");

		// 1.4 PC Modal Dark
		console.log("Switching to Doctor Shift Cockpit Modal (PC Dark)...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await pcPage.waitForTimeout(800);
		await clearToasts(pcPage);

		const modalDarkPath = path.join(OUT_DIR, "38_doctor_shift_cockpit_pc_dark.png");
		await pcPage.screenshot({
			path: modalDarkPath,
			fullPage: false,
		});
		console.log("Captured: 38_doctor_shift_cockpit_pc_dark.png");
		await copyToProofs("38_doctor_shift_cockpit_pc_dark.png");
		capturedFiles.push("38_doctor_shift_cockpit_pc_dark.png");

		await pcContext.close();

		// 2. Mobile Viewport (390x844, DPR: 2)
		console.log("Setting up Mobile Context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const mobilePage = await mobileContext.newPage();

		// Set initial localStorage state for mobile
		await mobilePage.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.evaluate(() => {
			localStorage.setItem("dente_clinic_token", "mock_clinic_token");
			localStorage.setItem("dente_staff_token", "mock_staff_token");
			localStorage.setItem("dente_active_session_token", "mock-session-token");
			localStorage.setItem("dente_organization_id", "c-1");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_perspective", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
			localStorage.setItem("dente_theme", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});

		// 2.1 Mobile Modal Light
		console.log("Navigating to Doctor Shift Cockpit Modal (Mobile Light)...");
		await mobilePage.goto("http://127.0.0.1:5173/?modal=doctor_shift_cockpit#clinical-modals-studio", { waitUntil: "networkidle", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="doctor-shift-cockpit-modal"]', { state: "visible", timeout: 15000 });
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await mobilePage.waitForTimeout(800);
		await clearToasts(mobilePage);

		const mobileLightPath = path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_light.png");
		await mobilePage.screenshot({
			path: mobileLightPath,
			fullPage: false,
		});
		console.log("Captured: 38_doctor_shift_cockpit_mobile_light.png");
		await copyToProofs("38_doctor_shift_cockpit_mobile_light.png");
		capturedFiles.push("38_doctor_shift_cockpit_mobile_light.png");

		// 2.2 Mobile Modal Dark
		console.log("Switching to Doctor Shift Cockpit Modal (Mobile Dark)...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await mobilePage.waitForTimeout(800);
		await clearToasts(mobilePage);

		const mobileDarkPath = path.join(OUT_DIR, "38_doctor_shift_cockpit_mobile_dark.png");
		await mobilePage.screenshot({
			path: mobileDarkPath,
			fullPage: false,
		});
		console.log("Captured: 38_doctor_shift_cockpit_mobile_dark.png");
		await copyToProofs("38_doctor_shift_cockpit_mobile_dark.png");
		capturedFiles.push("38_doctor_shift_cockpit_mobile_dark.png");

		await mobileContext.close();

		// 3. Mathematical MD5 Hash & File Size Integrity Verification
		console.log("\n=======================================================");
		console.log("RUNNING MATHEMATICAL MD5 HASH & INTEGRITY VERIFICATION");
		console.log("=======================================================");

		const hashes = new Map();
		const results = [];

		for (const file of capturedFiles) {
			const filePath = path.join(OUT_DIR, file);
			const stats = fs.statSync(filePath);
			const hash = calculateMd5(filePath);

			console.log(`[FILE] ${file} | Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB) | MD5: ${hash}`);

			if (stats.size < 30 * 1024) {
				throw new Error(`CRITICAL INTEGRITY FAILURE: File ${file} is suspiciously small (${stats.size} bytes). Minimum threshold is 30 KB.`);
			}

			if (hashes.has(hash)) {
				const duplicateFile = hashes.get(hash);
				throw new Error(
					`CRITICAL INTEGRITY FAILURE: Duplicate screenshot hash detected!\n` +
					`File 1: ${duplicateFile}\n` +
					`File 2: ${file}\n` +
					`MD5: ${hash}\n` +
					`Screen cloning and fake proofs are strictly prohibited by THE HAMMER CONSTITUTION.`
				);
			}

			hashes.set(hash, file);
			results.push({ file, size: stats.size, hash });
		}

		console.log("\nALL 6 SCREENSHOTS VERIFIED: 100% UNIQUE MD5 HASHES & NO CLONING DETECTED!\n");
		return results;
	} finally {
		await browser.close();
	}
}

capture()
	.then((results) => {
		console.log("SUCCESS: Exact screenshot capture and verification completed successfully.");
		process.exit(0);
	})
	.catch((err) => {
		console.error("\nCAPTURE FAILURE:", err.message);
		process.exit(1);
	});
