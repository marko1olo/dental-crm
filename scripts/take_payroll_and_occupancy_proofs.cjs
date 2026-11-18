/**
 * scripts/take_payroll_and_occupancy_proofs.cjs
 *
 * 4-STATE VISUAL PROOFS FOR DOCTOR PAYROLL & CHAIR OCCUPANCY
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "1a5ac924-43af-42a0-a684-00dbb822c536";
const SUBAGENT_ID = "9805dc1e-6ba2-4783-be39-76adf9afc260";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/analytics");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pOrch = path.join(OUT_ORCH, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pOrch);
	fs.copyFileSync(pDocs, pSelf);

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(800);
}

async function main() {
	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== Capturing Doctor Payroll & Chair Occupancy Proofs on ${baseUrl} ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});

		await context.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_perspective", "management");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: ["admin_schedule_grid", "admin_patient_search", "admin_cashier_checkout"],
				isDismissedPermanently: true,
				isPaused: true,
			}));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				onboardingDraftMode: false,
				version: 1,
			}));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				onboardingDismissed: true,
				onboardingStep: "done",
				onboardingDraftMode: false,
				version: 1,
			}));
		});

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

		await page.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 35000 });

		console.log("Waiting for app & analytics dashboard to mount...");
		for (let i = 0; i < 45; i++) {
			await page.waitForTimeout(1000);
			try {
				const state = await page.evaluate(() => {
					const hasAnalytics = Boolean(document.querySelector('[data-testid="executive-dashboard-root"], [data-testid="executive-financial-summary"], [data-testid="chair-occupancy-report"], [data-testid="doctor-payroll-report"], #analytics'));
					const hasBoot = Boolean(document.querySelector('.boot-state') || (document.body && document.body.innerText.includes("Загрузка системы...")));
					return { hasAnalytics, hasBoot };
				});
				if (state.hasAnalytics && !state.hasBoot) {
					console.log(`[READY at ${i + 1}s] Dashboard mounted!`);
					break;
				}
			} catch (e) {}
		}

		await suppressOverlays(page);
		await page.waitForTimeout(2000);

		// 1. Switch to Payroll Report: "Зарплаты врачей (Net)"
		console.log("\n--- Switching to: Зарплаты врачей (Net) ---");
		const payrollTab = page.locator('button:has-text("Зарплаты врачей (Net)")').first();
		await payrollTab.click();
		await page.waitForTimeout(1500);

		console.log("Capturing 05_payroll_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, "05_payroll_pc_light_1440x900.png");

		console.log("Capturing 06_payroll_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "06_payroll_pc_dark_1440x900.png");

		// 2. Switch to Chair Occupancy Report: "Загрузка кресел"
		console.log("\n--- Switching to: Загрузка кресел ---");
		const chairTab = page.locator('button:has-text("Загрузка кресел")').first();
		await chairTab.click();
		await page.waitForTimeout(1500);

		console.log("Capturing 07_chair_occupancy_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveProof(page, "07_chair_occupancy_pc_light_1440x900.png");

		console.log("Capturing 08_chair_occupancy_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveProof(page, "08_chair_occupancy_pc_dark_1440x900.png");

		await context.close();
		console.log("\n>>> [SUCCESS] Payroll and Occupancy proofs captured! <<<");
	} finally {
		if (browser) await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
