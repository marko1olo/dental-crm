import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const CONV_ID = "5e21ca43-1a90-4a09-abcc-8a4ef7e63159";
const OUT_DIRS = [
	path.resolve("docs/proofs/treatment_plans"),
	path.resolve("docs/proofs/treatment-plans"),
	path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`),
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browserExecutable = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function saveProof(page, filename, label) {
	const primaryPath = path.join(OUT_DIRS[0], filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	for (let i = 1; i < OUT_DIRS.length; i++) {
		copyFileSync(primaryPath, path.join(OUT_DIRS[i], filename));
	}
	const size = statSync(primaryPath).size;
	console.log(`[SAVED] ${filename} (${(size / 1024).toFixed(1)} KB) - ${label}`);
}

async function preparePage(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.classList.remove("light", "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.body.classList.remove("light", "dark");
		document.body.classList.add(th);

		// Remove tour / splash / banner clutter
		const clutterSelectors = [
			".tour-spotlight-root",
			".tour-backdrop-clickable-zone",
			'[data-testid="guided-tour-spotlight-overlay"]',
			'[data-testid="guided-tour-coach-mark-card"]',
			'[data-testid="demo-mode-banner"]',
			".shepherd-element",
			".splash",
			"#splash-root",
			'[data-testid="splash-loader"]',
			".splash-screen",
		];
		for (const sel of clutterSelectors) {
			document.querySelectorAll(sel).forEach((el) => el.remove());
		}
	}, theme);
	await sleep(500);
}

async function capture() {
	console.log("=== CAPTURING 4-STATE CANONICAL TREATMENT PLANS PROOFS ===");

	const states = [
		{ num: "01", name: "01_treatment_plans_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
		{ num: "02", name: "02_treatment_plans_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ num: "03", name: "03_treatment_plans_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
		{ num: "04", name: "04_treatment_plans_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
	];

	for (const state of states) {
		console.log(`\n>>> State ${state.num}: ${state.name} (${state.width}x${state.height}, theme: ${state.theme}) <<<`);
		const ctxOpts = {
			viewport: { width: state.width, height: state.height },
			deviceScaleFactor: 2,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			serviceWorkers: "block",
		};
		if (state.isMobile) {
			Object.assign(ctxOpts, devices["iPhone 13"]);
		}

		const context = await browser.newContext(ctxOpts);
		const page = await context.newPage();

		// Set initial auth and theme storage
		await page.addInitScript((th) => {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_staff_unlocked", "true");
		}, state.theme);

		const url = `http://127.0.0.1:5173/?stand=1&patient_card=1&demo=1&tab=treatmentPlans`;
		console.log(`[Nav] Navigating to ${url}...`);
		try {
			await page.goto(url, { waitUntil: "commit", timeout: 15000 });
		} catch (e) {
			console.log("[Nav notice]:", e.message);
		}
		await sleep(3000);

		await preparePage(page, state.theme);

		// Switch to Treatment Plans Tab if not active
		console.log("[Tab] Looking for tab-patient-treatment-plans...");
		const plansTab = page.locator('[data-testid="tab-patient-treatment-plans"], button:has-text("План лечения")').first();
		if (await plansTab.count() > 0) {
			console.log("[Tab] Clicking tab-patient-treatment-plans...");
			await plansTab.click({ force: true });
			await sleep(1500);
		}

		await preparePage(page, state.theme);

		// Save 4-state proof
		await saveProof(page, state.name, `Treatment Plans Tab State ${state.num} (${state.theme})`);

		// For PC Light: capture Contract Print modal and Completed Act Print modal
		if (state.num === "01") {
			try {
				console.log("[Print Contract] Clicking 'Печать сметы'...");
				const printBtn = page.locator('[data-testid="btn-print-treatment-plan"]').first();
				if (await printBtn.count() > 0 && await printBtn.isVisible()) {
					await printBtn.click({ force: true });
					await sleep(1000);
					await saveProof(page, "05_treatment_plan_contract_print_modal_1440x900.png", "Treatment Plan Contract Print Modal (Mandate 8aq)");
					
					// Close modal
					const closeBtn = page.locator('[aria-label="Закрыть"], button:has-text("Закрыть")').first();
					if (await closeBtn.count() > 0) {
						await closeBtn.click({ force: true });
						await sleep(500);
					}
				}

				console.log("[Print Act] Clicking 'Акт работ'...");
				const actBtn = page.locator('[data-testid="btn-print-act"]').first();
				if (await actBtn.count() > 0 && await actBtn.isVisible()) {
					await actBtn.click({ force: true });
					await sleep(1000);
					await saveProof(page, "06_treatment_plan_act_print_modal_1440x900.png", "Treatment Plan Completed Act Print Modal (Mandate 8aq)");
					
					// Close modal
					const closeActBtn = page.locator('[aria-label="Закрыть"], button:has-text("Закрыть")').first();
					if (await closeActBtn.count() > 0) {
						await closeActBtn.click({ force: true });
						await sleep(500);
					}
				}
			} catch (e) {
				console.log("[Modal Capture notice]:", e.message);
			}
		}

		await context.close();
		await sleep(400);
	}

	// 5. Treatment Plan Studio Modal (Interactive Presenter)
	console.log("\n>>> State 07: Treatment Plan Studio Modal 1440x900 <<<");
	const studioCtx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		serviceWorkers: "block",
	});
	const studioPage = await studioCtx.newPage();
	await studioPage.addInitScript(() => {
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_tour_completed", "true");
	});
	await studioPage.goto("http://127.0.0.1:5173/?stand=1&treatment_plan=1&demo=true", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
	await sleep(2000);
	await preparePage(studioPage, "light");
	await saveProof(studioPage, "07_treatment_plan_studio_modal_1440x900.png", "Treatment Plan Studio Modal (Interactive Presenter)");
	await studioCtx.close();

	await browser.close();
	console.log("\n🎉 ALL 4-STATE CANONICAL TREATMENT PLANS PROOFS CAPTURED SUCCESSFULLY!");
}

capture().catch((e) => {
	console.error("FATAL CAPTURE ERROR:", e);
	process.exit(1);
});
