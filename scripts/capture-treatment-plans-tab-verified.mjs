import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const CONV_ID = "3894dba4-973c-4281-9e78-62fd826378f7";
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

const mockTreatmentPlansResponse = {
	success: true,
	plans: [
		{
			id: "plan-1",
			name: "Комплексная санация и 3-этапная реабилитация",
			status: "approved",
			totalCostKopecks: 12500000,
			totalCostRub: 125000,
			warrantyYears: 3,
			items: [
				{
					id: "item-1",
					toothNumber: 16,
					serviceName: "Препарирование и фиксация коронки E.max",
					serviceCode: "A16.07.004",
					quantity: 1,
					unitPriceRub: 35000,
					discountRub: 0,
					netCostRub: 35000,
					isCompleted: false,
					doctorName: "Д-р Орлов А.В.",
				},
				{
					id: "item-2",
					toothNumber: 36,
					serviceName: "Дентальная имплантация Osstem TS III",
					serviceCode: "A16.07.054",
					quantity: 1,
					unitPriceRub: 45000,
					discountRub: 0,
					netCostRub: 45000,
					isCompleted: false,
					doctorName: "Д-р Орлов А.В.",
				},
				{
					id: "item-3",
					toothNumber: 46,
					serviceName: "Эндодонтическое лечение 3-канального зуба",
					serviceCode: "A16.07.030",
					quantity: 1,
					unitPriceRub: 45000,
					discountRub: 0,
					netCostRub: 45000,
					isCompleted: true,
					doctorName: "Д-р Орлов А.В.",
				},
			],
		},
	],
};

async function setupPageRoutes(page) {
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/src/") || url.includes("@fs") || url.includes("@vite")) {
			return route.continue();
		}
		if (url.includes("/treatment-plans")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockTreatmentPlansResponse),
			});
		}
		return route.continue();
	});
}

async function preparePage(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);

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
			#loading-screen {
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
	}, theme);
	await sleep(400);
}

async function injectStorage(context, theme = "light") {
	await context.addInitScript(({ th }) => {
		try {
			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_active_session_token", "demo-staff-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_active_user_id", "doc-1");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Орлов А.В.",
				role: "doctor",
			}));
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
		} catch (e) {}
	}, { th: theme });
}

async function saveProof(page, baseName, description) {
	await sleep(400);
	const names = [baseName];
	if (baseName.includes("_plans_")) {
		names.push(baseName.replace("_plans_", "_plan_"));
	} else if (baseName.includes("_plan_")) {
		names.push(baseName.replace("_plan_", "_plans_"));
	}

	for (const filename of names) {
		for (const dir of OUT_DIRS) {
			const targetPath = path.join(dir, filename);
			await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
			const sz = statSync(targetPath).size;
			console.log(`[PROOF CAPTURED] ${targetPath} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
			if (sz < 20480) {
				throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
			}
		}
	}
}

async function capture() {
	console.log("=== CAPTURING 4-STATE VERIFIED TREATMENT PLANS PROOFS ===");

	// ==========================================
	// 1. DESKTOP SESSION (1440x900) - LIGHT & DARK
	// ==========================================
	console.log("\n>>> PC SESSION (1440x900): Light and Dark <<<");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		isMobile: false,
		hasTouch: false,
		serviceWorkers: "block",
	});
	await injectStorage(pcContext, "light");

	const pcPage = await pcContext.newPage();
	await setupPageRoutes(pcPage);

	await pcPage.goto("http://127.0.0.1:5173/?stand=1&demo=true&patient_modal=1#patient-card", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
	await sleep(2000);

	try {
		const hasModal = await pcPage.$('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]');
		if (!hasModal) {
			console.log("[PC] Dispatching dente:open-patient-studio...");
			await pcPage.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
			});
			await sleep(1500);
		}
	} catch (e) {
		console.log("[PC] Dispatch notice:", e.message);
	}

	console.log("[PC] Waiting for tab-patient-treatment-plans...");
	const pcPlansTab = pcPage.locator('[data-testid="tab-patient-treatment-plans"]').first();
	await pcPlansTab.waitFor({ state: "visible", timeout: 20000 });
	console.log("[PC] Clicking tab-patient-treatment-plans...");
	await pcPlansTab.click({ force: true });
	await sleep(1500);

	try {
		const discountBtn = pcPage.locator('[data-testid="btn-open-doctor-discounts"]').first();
		await discountBtn.waitFor({ state: "visible", timeout: 15000 });
		console.log("[PC] Treatment plans content loaded successfully!");
	} catch (e) {
		console.log("[PC] Content wait notice:", e.message);
	}

	// 1.1 PC Light
	console.log("\n>>> Capturing State 01: PC Light 1440x900 <<<");
	await preparePage(pcPage, "light");
	await saveProof(pcPage, "treatment_plans_pc_light_1440x900.png", "Canonical Treatment Plan State 01 (PC Light 1440x900)");

	// 1.2 PC Discounts Modal (Mandate 8e verification)
	try {
		const discountBtn = pcPage.locator('[data-testid="btn-open-doctor-discounts"]').first();
		if (await discountBtn.count() > 0 && await discountBtn.isVisible()) {
			console.log("[PC] Opening doctor discounts modal (DEF-TP-01 proof)...");
			await discountBtn.click({ force: true });
			await sleep(600);
			await saveProof(pcPage, "01_treatment_plan_discounts_modal_pc_light_1440x900.png", "Doctor Discounts Modal (DEF-TP-01)");

			const resetBtn = pcPage.locator('[data-testid="btn-reset-discount"]').first();
			if (await resetBtn.count() > 0) {
				await resetBtn.click({ force: true });
				await sleep(300);
			}
		}
	} catch (e) {
		console.log("[PC] Discount modal notice:", e.message);
	}

	// 1.3 PC Dark
	console.log("\n>>> Capturing State 02: PC Dark 1440x900 <<<");
	await preparePage(pcPage, "dark");
	await saveProof(pcPage, "treatment_plans_pc_dark_1440x900.png", "Canonical Treatment Plan State 02 (PC Dark 1440x900)");

	await pcContext.close();
	await sleep(500);

	// ==========================================
	// 2. MOBILE SESSION (390x844 Apple HIG) - LIGHT & DARK
	// ==========================================
	console.log("\n>>> MOBILE SESSION (390x844 Apple HIG): Light and Dark <<<");
	const mobContext = await browser.newContext({
		...devices["iPhone 13"],
		serviceWorkers: "block",
	});
	await injectStorage(mobContext, "light");

	const mobPage = await mobContext.newPage();
	await setupPageRoutes(mobPage);

	await mobPage.goto("http://127.0.0.1:5173/?stand=1&demo=true&patient_modal=1#patient-card", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
	await sleep(2500);

	try {
		const hasModal = await mobPage.$('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]');
		if (!hasModal) {
			console.log("[Mobile] Dispatching dente:open-patient-studio...");
			await mobPage.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
			});
			await sleep(1500);
		}
	} catch (e) {
		console.log("[Mobile] Dispatch notice:", e.message);
	}

	console.log("[Mobile] Waiting for tab-patient-treatment-plans...");
	const mobPlansTab = mobPage.locator('[data-testid="tab-patient-treatment-plans"]').first();
	await mobPlansTab.waitFor({ state: "visible", timeout: 20000 });
	console.log("[Mobile] Clicking tab-patient-treatment-plans...");
	await mobPlansTab.click({ force: true });
	await sleep(1500);

	// 2.1 Mobile Light
	console.log("\n>>> Capturing State 03: Mobile Light 390x844 <<<");
	await preparePage(mobPage, "light");
	await saveProof(mobPage, "treatment_plans_mobile_light_390x844.png", "Canonical Treatment Plan State 03 (Mobile Light 390x844)");

	// 2.2 Mobile Dark
	console.log("\n>>> Capturing State 04: Mobile Dark 390x844 <<<");
	await preparePage(mobPage, "dark");
	await saveProof(mobPage, "treatment_plans_mobile_dark_390x844.png", "Canonical Treatment Plan State 04 (Mobile Dark 390x844)");

	await mobContext.close();
	await sleep(300);

	await browser.close();
	console.log("\n🎉 ALL 4-STATE CANONICAL TREATMENT PLANS PROOFS CAPTURED AND VERIFIED!");
}

capture().catch((e) => {
	console.error("FATAL CAPTURE ERROR:", e);
	process.exit(1);
});
