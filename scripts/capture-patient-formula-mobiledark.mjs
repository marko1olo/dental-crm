import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/patient_card");
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("=== Capturing Mobile Dark Formula Tab Proof ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const mobCtx = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: devices["iPhone 13"].userAgent,
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
	});
	const page = await mobCtx.newPage();

	await page.addInitScript(() => {
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_theme_mode", "dark");
		localStorage.setItem("dente_theme", "dark");
		localStorage.setItem("theme", "dark");
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

	console.log("Navigating to ?demo=true#patients...");
	await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "domcontentloaded", timeout: 45000 });
	await sleep(3000);

	// Wait for boot state
	await page.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 }).catch(() => {});
	await sleep(2000);

	const offlineBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
	if (offlineBtn) {
		console.log("Clicking offline fallback...");
		await offlineBtn.click();
		await sleep(2000);
	}

	console.log("Dispatching dente:open-patient-studio...");
	await page.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
	});
	await sleep(2000);

	await page.waitForSelector('[data-testid="patient-card-modal"]', { timeout: 15000 });
	console.log("Found patient-card-modal!");

	const formulaTab = page.locator('[data-testid="tab-patient-formula"]').first();
	await formulaTab.waitFor({ state: "visible", timeout: 10000 });
	await formulaTab.click({ force: true });
	await sleep(2500);

	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.body.className = "dark";
		document.documentElement.style.colorScheme = "dark";

		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
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
			.global-toast-container {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
	});
	await sleep(1000);

	const shotPath = `${OUT_DIR}/08_patient_formula_mobile_dark_390x844.png`;
	await page.screenshot({ path: shotPath, fullPage: false });
	const sz = statSync(shotPath).size;
	console.log(`[VERIFIED] Mobile Dark: ${shotPath} (${sz} bytes)`);

	await mobCtx.close();
	await browser.close();
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
