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
		document.querySelectorAll('.toast, [role="alert"], [data-testid="global-toast"]').forEach((el) => {
			if (!el.getAttribute("data-testid")?.includes("odontogram-critical-somatic-alert")) {
				el.remove();
			}
		});
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

async function setupDoctorSession(page, theme = "light") {
	await page.evaluate((th) => {
		localStorage.setItem("dente_clinic_token", "dental_live_token");
		localStorage.setItem("dente_staff_token", "staff_live_token");
		localStorage.setItem("dente_active_session_token", "session_token_123");
		localStorage.setItem("dente_organization_id", "org_dental_1");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dente_perspective", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Смирнов Алексей Петрович");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
		localStorage.setItem("dente_theme", th);
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}
	}, theme);
}

async function capture() {
	console.log("Launching Chromium for Visit Odontogram Tab audit (4-state proof)...");
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

		// Initial load to set localStorage
		await pcPage.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(pcPage, "light");

		// 1.1 PC Light
		console.log("Navigating to Visit Odontogram Tab (PC Light)...");
		await pcPage.goto("http://127.0.0.1:5173/?modal=visit_odontogram&theme=light#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(pcPage, "light");
		await pcPage.waitForSelector('[data-testid="visit-odontogram-tab"]', { state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(1000);
		await clearToasts(pcPage);

		const pcLightPath = path.join(OUT_DIR, "39_visit_odontogram_pc_light.png");
		await pcPage.screenshot({
			path: pcLightPath,
			fullPage: false,
		});
		console.log("Captured: 39_visit_odontogram_pc_light.png");
		await copyToProofs("39_visit_odontogram_pc_light.png");
		capturedFiles.push("39_visit_odontogram_pc_light.png");

		// 1.2 PC Dark
		console.log("Switching to Visit Odontogram Tab (PC Dark)...");
		await pcPage.goto("http://127.0.0.1:5173/?modal=visit_odontogram&theme=dark#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(pcPage, "dark");
		await pcPage.waitForSelector('[data-testid="visit-odontogram-tab"]', { state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(1000);
		await clearToasts(pcPage);

		const pcDarkPath = path.join(OUT_DIR, "39_visit_odontogram_pc_dark.png");
		await pcPage.screenshot({
			path: pcDarkPath,
			fullPage: false,
		});
		console.log("Captured: 39_visit_odontogram_pc_dark.png");
		await copyToProofs("39_visit_odontogram_pc_dark.png");
		capturedFiles.push("39_visit_odontogram_pc_dark.png");

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

		// 2.1 Mobile Light
		console.log("Navigating to Visit Odontogram Tab (Mobile Light)...");
		await mobilePage.goto("http://127.0.0.1:5173/?modal=visit_odontogram&theme=light#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(mobilePage, "light");
		await mobilePage.waitForSelector('[data-testid="visit-odontogram-tab"]', { state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(1000);
		await clearToasts(mobilePage);

		const mobileLightPath = path.join(OUT_DIR, "39_visit_odontogram_mobile_light.png");
		await mobilePage.screenshot({
			path: mobileLightPath,
			fullPage: false,
		});
		console.log("Captured: 39_visit_odontogram_mobile_light.png");
		await copyToProofs("39_visit_odontogram_mobile_light.png");
		capturedFiles.push("39_visit_odontogram_mobile_light.png");

		// 2.2 Mobile Dark
		console.log("Switching to Visit Odontogram Tab (Mobile Dark)...");
		await mobilePage.goto("http://127.0.0.1:5173/?modal=visit_odontogram&theme=dark#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 30000 });
		await setupDoctorSession(mobilePage, "dark");
		await mobilePage.waitForSelector('[data-testid="visit-odontogram-tab"]', { state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(1000);
		await clearToasts(mobilePage);

		const mobileDarkPath = path.join(OUT_DIR, "39_visit_odontogram_mobile_dark.png");
		await mobilePage.screenshot({
			path: mobileDarkPath,
			fullPage: false,
		});
		console.log("Captured: 39_visit_odontogram_mobile_dark.png");
		await copyToProofs("39_visit_odontogram_mobile_dark.png");
		capturedFiles.push("39_visit_odontogram_mobile_dark.png");

		await mobileContext.close();

		// 3. Integrity Verification
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

		console.log("\nALL 4 SCREENSHOTS VERIFIED: 100% UNIQUE MD5 HASHES & NO CLONING DETECTED!\n");
		return results;
	} finally {
		await browser.close();
	}
}

capture()
	.then((results) => {
		console.log("SUCCESS: Visit odontogram tab screenshots captured and verified successfully.");
		process.exit(0);
	})
	.catch((err) => {
		console.error("\nCAPTURE FAILURE:", err.message);
		process.exit(1);
	});
