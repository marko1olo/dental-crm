const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIRS = [
	path.resolve("docs/proofs/treatment-plans"),
	path.resolve("docs/proofs/treatment_plans"),
];
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/cd1e87fa-8eac-4adb-a092-61f733f60e3b");

for (const dir of PROOFS_DIRS) {
	fs.mkdirSync(dir, { recursive: true });
}
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function takeProof(page, filename, description) {
	const filenames = [
		filename,
		filename.startsWith("treatment_plans_")
			? filename.replace("treatment_plans_", "treatment_plan_")
			: filename.replace("treatment_plan_", "treatment_plans_"),
	];

	const primaryProofPath = path.join(PROOFS_DIRS[0], filenames[0]);
	await page.screenshot({ path: primaryProofPath, fullPage: false });

	for (const dir of PROOFS_DIRS) {
		for (const fname of filenames) {
			const targetPath = path.join(dir, fname);
			if (targetPath !== primaryProofPath) {
				fs.copyFileSync(primaryProofPath, targetPath);
			}
		}
	}

	for (const fname of filenames) {
		const brainPath = path.join(BRAIN_DIR, fname);
		fs.copyFileSync(primaryProofPath, brainPath);
	}

	const stats = fs.statSync(primaryProofPath);
	console.log(`[PROOF CAPTURED] ${filename} (${stats.size} bytes) -> ${description}`);
	if (stats.size < 20480) {
		throw new Error(`Screenshot ${filename} is too small (${stats.size} bytes < 20KB)`);
	}
}

async function main() {
	console.log("=== STARTING 4-STATE TREATMENT PLANS PROOF CAPTURE ===");

	// 1. Authenticate with API
	console.log("Authenticating with API...");
	const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	const auth = await loginRes.json();
	console.log("Auth success. clinicToken:", Boolean(auth.clinicToken), "staffToken:", Boolean(auth.staffToken));

	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
	console.log("Using browser binary:", browserPath);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
	});

	try {
		// ==========================================
		// 1. PC CONTEXT (1440x900)
		// ==========================================
		console.log("\n--- 1. Desktop 1440x900 Context ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		await pcContext.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		]);

		const pcPage = await pcContext.newPage();
		await pcPage.addInitScript((tokens) => {
			try {
				localStorage.setItem("dente_clinic_token", tokens.clinicToken || "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", tokens.staffToken || "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", tokens.staffToken || "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: tokens.userId || "owner-1",
					name: "Д-р Воронов Алексей Владимирович",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					specialties: ["Стоматолог-терапевт", "Ортопед"]
				}));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("dente_last_view", "pipeline");
				localStorage.setItem("dente_onboarding_completed", "true");
			} catch (e) {
				// Ignore about:blank access error
			}
		}, auth);

		pcPage.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log(`[PC BROWSER ERROR]:`, msg.text());
			}
		});
		pcPage.on("pageerror", (err) => console.log("[PC PAGE ERROR]:", err.message));

		console.log("Navigating to http://127.0.0.1:5173/?demo=true#pipeline ...");
		await pcPage.goto(`${APP_BASE}/?demo=true#pipeline`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {
			return pcPage.goto(`${APP_BASE}/?demo=true#pipeline`, { waitUntil: "domcontentloaded", timeout: 45000 });
		});

		console.log("Waiting for CRM hydration...");
		await pcPage.waitForFunction(() => {
			const text = document.body.innerText || "";
			return text.length > 50 && !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
		}, { timeout: 35000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		console.log("Current page URL:", pcPage.url());
		const hasOpenBtn = await pcPage.evaluate(() => {
			const btns = Array.from(document.querySelectorAll('[data-testid="pipeline-card-open-plan-btn"]'));
			const allBtns = Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim()).filter(Boolean);
			return {
				openBtnsCount: btns.length,
				someButtons: allBtns.slice(0, 15),
				bodySnippet: document.body.innerText.slice(0, 400),
			};
		});
		console.log("Page inspection:", JSON.stringify(hasOpenBtn, null, 2));

		if (hasOpenBtn.openBtnsCount === 0) {
			const pipelineTab = pcPage.locator('a[href="#pipeline"], [data-nav="pipeline"]').first();
			if (await pipelineTab.isVisible().catch(() => false)) {
				console.log("Clicking pipeline nav link...");
				await pipelineTab.click();
				await pcPage.waitForTimeout(2000);
			}
		}

		console.log("Looking for pipeline plan open buttons...");
		await pcPage.waitForFunction(() => {
			return Boolean(document.querySelector('[data-testid="pipeline-card-open-plan-btn"]'));
		}, { timeout: 30000 });
		console.log("Clicking first pipeline card plan button via DOM evaluate...");
		await pcPage.evaluate(() => {
			const btn = document.querySelector('[data-testid="pipeline-card-open-plan-btn"]');
			if (btn) btn.click();
		});

		// Wait for TreatmentPlanPresenterModal
		console.log("Waiting for TreatmentPlanPresenterModal...");
		await pcPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(1500);

		// PC Light
		console.log("Capturing PC Light...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await pcPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 10000 });
		await pcPage.waitForTimeout(1000);
		await takeProof(
			pcPage,
			"treatment_plans_pc_light_1440x900.png",
			"TreatmentPlanPresenterModal & 3-Tier comparison (PC Light 1440x900)"
		);

		// PC Dark
		console.log("Capturing PC Dark...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await pcPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 10000 });
		await pcPage.waitForTimeout(1000);
		await takeProof(
			pcPage,
			"treatment_plans_pc_dark_1440x900.png",
			"TreatmentPlanPresenterModal & 3-Tier comparison (PC Dark 1440x900)"
		);

		await pcContext.close();

		// ==========================================
		// 2. MOBILE CONTEXT (390x844)
		// ==========================================
		console.log("\n--- 2. Mobile 390x844 Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		]);

		const mobilePage = await mobileContext.newPage();
		await mobilePage.addInitScript((tokens) => {
			try {
				localStorage.setItem("dente_clinic_token", tokens.clinicToken || "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", tokens.staffToken || "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", tokens.staffToken || "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: tokens.userId || "owner-1",
					name: "Д-р Воронов Алексей Владимирович",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					specialties: ["Стоматолог-терапевт", "Ортопед"]
				}));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("dente_last_view", "pipeline");
				localStorage.setItem("dente_onboarding_completed", "true");
			} catch (e) {
				// Ignore about:blank access error
			}
		}, auth);

		console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#pipeline ...");
		await mobilePage.goto(`${APP_BASE}/?demo=true#pipeline`, { waitUntil: "domcontentloaded", timeout: 45000 });

		console.log("Waiting for mobile CRM hydration...");
		await mobilePage.waitForFunction(() => {
			const text = document.body.innerText || "";
			return text.length > 50 && !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
		}, { timeout: 35000 });
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		await mobilePage.waitForFunction(() => {
			return Boolean(document.querySelector('[data-testid="pipeline-card-open-plan-btn"]'));
		}, { timeout: 15000 });
		console.log("Triggering click on pipeline plan button via DOM evaluate...");
		await mobilePage.evaluate(() => {
			const btn = document.querySelector('[data-testid="pipeline-card-open-plan-btn"]');
			if (btn) btn.click();
		});

		await mobilePage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(1500);

		// Mobile Light
		console.log("Capturing Mobile Light...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await mobilePage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 10000 });
		await mobilePage.waitForTimeout(1000);
		await takeProof(
			mobilePage,
			"treatment_plans_mobile_light_390x844.png",
			"TreatmentPlanPresenterModal & 3-Tier comparison (Mobile Light 390x844)"
		);

		// Mobile Dark
		console.log("Capturing Mobile Dark...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await mobilePage.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { state: "visible", timeout: 10000 });
		await mobilePage.waitForTimeout(1000);
		await takeProof(
			mobilePage,
			"treatment_plans_mobile_dark_390x844.png",
			"TreatmentPlanPresenterModal & 3-Tier comparison (Mobile Dark 390x844)"
		);

		await mobileContext.close();

		console.log("\n=== ALL 4-STATE SCREENSHOTS SUCCESSFULLY CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
