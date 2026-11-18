import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/patient_card");
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initStorage = (page) => {
	return page.addInitScript(() => {
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem(
			"dental-crm:active-user:v1",
			JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
			}),
		);
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true }));
	});
};

const applyTheme = async (page, theme) => {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);

		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.splash,
			#splash-root,
			[data-testid="splash-loader"],
			.splash-screen,
			#loading-screen,
			.global-toast-container,
			[role="alert"]:not([data-testid="patient-card-modal-somatic-banner"]) {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
	}, theme);
	await sleep(600);
};

async function openPatientCardAndFormula(page) {
	console.log("Navigating to ?demo=true#patients...");
	await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });

	console.log("Waiting for boot state to detach...");
	await page.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 }).catch(() => {});
	await sleep(2000);

	const offlineBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
	if (offlineBtn) {
		console.log("Clicking offline fallback...");
		await offlineBtn.click();
		await sleep(2000);
	}

	// Try dispatching studio event or clicking patient row
	try {
		console.log("Dispatching dente:open-patient-studio to open modal directly...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
		});
		await sleep(1500);
	} catch (e) {
		console.log("Dispatch error:", e.message);
	}

	const modal = await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { timeout: 15000 }).catch(() => null);
	if (!modal) {
		console.log("Modal not found via event, clicking patient row...");
		const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
		if (await row.count() > 0) {
			await row.click({ force: true });
			await sleep(1000);
			const openBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
			if (await openBtn.count() > 0) {
				await openBtn.click({ force: true });
				await sleep(1500);
			}
		}
	}

	// Wait for modal
	await page.waitForSelector('[data-testid="patient-card-modal"]', { timeout: 15000 });
	console.log("PatientCardModal is visible! Clicking Formula tab...");

	const formulaTab = page.locator('[data-testid="tab-patient-formula"]').first();
	await formulaTab.waitFor({ state: "visible", timeout: 10000 });
	await formulaTab.click({ force: true });
	await sleep(2000);
	console.log("Switched to Formula tab successfully.");
}

async function run() {
	console.log("=== Capturing High Fidelity Formula Tab 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	// 1. PC Light
	console.log("\n--- [1/4] PC Light (1440x900) ---");
	{
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
		const page = await pcCtx.newPage();
		await initStorage(page);
		await openPatientCardAndFormula(page);
		await applyTheme(page, "light");
		const shotPath = `${OUT_DIR}/05_patient_formula_pc_light_1440x900.png`;
		await page.screenshot({ path: shotPath, fullPage: false });
		const sz = statSync(shotPath).size;
		console.log(`[VERIFIED] PC Light: ${shotPath} (${sz} bytes)`);
		if (sz < 20480) throw new Error("PC Light < 20KB");
		await pcCtx.close();
	}

	// 2. PC Dark
	console.log("\n--- [2/4] PC Dark (1440x900) ---");
	{
		const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
		const page = await pcCtx.newPage();
		await initStorage(page);
		await openPatientCardAndFormula(page);
		await applyTheme(page, "dark");
		const shotPath = `${OUT_DIR}/06_patient_formula_pc_dark_1440x900.png`;
		await page.screenshot({ path: shotPath, fullPage: false });
		const sz = statSync(shotPath).size;
		console.log(`[VERIFIED] PC Dark: ${shotPath} (${sz} bytes)`);
		if (sz < 20480) throw new Error("PC Dark < 20KB");
		await pcCtx.close();
	}

	// 3. Mobile Light
	console.log("\n--- [3/4] Mobile Light (390x844) ---");
	{
		const mobCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: devices["iPhone 13"].userAgent,
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const page = await mobCtx.newPage();
		await initStorage(page);
		await openPatientCardAndFormula(page);
		await applyTheme(page, "light");
		const shotPath = `${OUT_DIR}/07_patient_formula_mobile_light_390x844.png`;
		await page.screenshot({ path: shotPath, fullPage: false });
		const sz = statSync(shotPath).size;
		console.log(`[VERIFIED] Mobile Light: ${shotPath} (${sz} bytes)`);
		if (sz < 20480) throw new Error("Mobile Light < 20KB");
		await mobCtx.close();
	}

	// 4. Mobile Dark
	console.log("\n--- [4/4] Mobile Dark (390x844) ---");
	{
		const mobCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: devices["iPhone 13"].userAgent,
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const page = await mobCtx.newPage();
		await initStorage(page);
		await openPatientCardAndFormula(page);
		await applyTheme(page, "dark");
		const shotPath = `${OUT_DIR}/08_patient_formula_mobile_dark_390x844.png`;
		await page.screenshot({ path: shotPath, fullPage: false });
		const sz = statSync(shotPath).size;
		console.log(`[VERIFIED] Mobile Dark: ${shotPath} (${sz} bytes)`);
		if (sz < 20480) throw new Error("Mobile Dark < 20KB");
		await mobCtx.close();
	}

	await browser.close();
	console.log("\n=== ALL 4 FORMULA STATES CAPTURED SUCCESSFULLY! ===");
}

run().catch((e) => {
	console.error("FATAL ERROR:", e);
	process.exit(1);
});
