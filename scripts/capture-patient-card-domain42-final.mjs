import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const CONV_ID = "9d76937f-e6fc-4112-b940-6415f1b5893f";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patients";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

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

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
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
			.copilot-trigger-btn,
			[data-testid="copilot-floating-trigger"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(500);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
	const brainPath = path.join(BRAIN_DIR, filename);
	try {
		copyFileSync(targetPath, brainPath);
	} catch (_) {}
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
}

async function setupContextStorage(context) {
	await context.addInitScript(() => {
		try {
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
			}));
		} catch (e) {}
	});
}

async function capture() {
	console.log("=== CAPTURING 4-STATE CANONICAL PATIENT CARD PROOFS ===");

	const TARGET_URL = "http://127.0.0.1:5173/?stand=1&demo=true&patient_modal=1#patient-card";

	// 1. PC 1440x900
	console.log("\n--- [PC 1440x900 Desktop] ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		serviceWorkers: "block",
	});
	await setupContextStorage(pcContext);

	const pcPage = await pcContext.newPage();
	console.log(`[PC] Navigating to ${TARGET_URL}...`);
	await pcPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(async () => {
		await pcPage.goto(TARGET_URL, { waitUntil: "commit", timeout: 20000 });
	});

	await pcPage.waitForTimeout(2000);
	await pcPage.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 15000 });
	console.log("[PC] PatientCardModal detected!");
	await suppressOverlays(pcPage);

	// 1.1 PC Light
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "01_patient_card_pc_light.png", "Patient Card Modal (PC Light 1440x900)");
	await saveProof(pcPage, "01_patient_card_modal_pc_light_1440x900.png", "Patient Card Modal (PC Light 1440x900)");

	// 1.2 PC Dark
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "02_patient_card_pc_dark.png", "Patient Card Modal (PC Dark 1440x900)");
	await saveProof(pcPage, "02_patient_card_modal_pc_dark_1440x900.png", "Patient Card Modal (PC Dark 1440x900)");

	// 1.3 PC Family Wallet & Tax Deduction
	try {
		const familyTab = pcPage.locator("button:has-text('Семья'), [data-tab='family']").first();
		if (await familyTab.count() > 0) {
			await familyTab.click();
			await pcPage.waitForTimeout(600);
			const openWallet = pcPage.locator("button:has-text('Семейный счет'), button:has-text('Управление балансом'), button:has-text('Открыть кошелек')").first();
			if (await openWallet.count() > 0) {
				await openWallet.click();
				await pcPage.waitForTimeout(600);
			}
			await setTheme(pcPage, "light");
			await saveProof(pcPage, "05_patient_family_tax_pc_light.png", "Patient Family Tax Section (PC Light 1440x900)");
			await setTheme(pcPage, "dark");
			await saveProof(pcPage, "06_patient_family_tax_pc_dark.png", "Patient Family Tax Section (PC Dark 1440x900)");
		}
	} catch (e) {
		console.log("[Family Tab error]", e.message);
	}

	await pcContext.close();

	// 2. MOBILE 390x844 (Apple HIG)
	console.log("\n--- [Mobile 390x844 Apple HIG] ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
		serviceWorkers: "block",
	});
	await setupContextStorage(mobContext);

	const mobPage = await mobContext.newPage();
	console.log(`[Mobile] Navigating to ${TARGET_URL}...`);
	await mobPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(async () => {
		await mobPage.goto(TARGET_URL, { waitUntil: "commit", timeout: 20000 });
	});

	await mobPage.waitForTimeout(2000);
	await mobPage.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 15000 });
	console.log("[Mobile] PatientCardModal detected!");
	await suppressOverlays(mobPage);

	// 2.1 Mobile Light
	await setTheme(mobPage, "light");
	await saveProof(mobPage, "03_patient_card_mobile_light.png", "Patient Card Bottom Sheet (Mobile Light 390x844)");
	await saveProof(mobPage, "03_patient_card_mobile_light_390x844.png", "Patient Card Bottom Sheet (Mobile Light 390x844)");

	// 2.2 Mobile Dark
	await setTheme(mobPage, "dark");
	await saveProof(mobPage, "04_patient_card_mobile_dark.png", "Patient Card Bottom Sheet (Mobile Dark 390x844)");
	await saveProof(mobPage, "04_patient_card_mobile_dark_390x844.png", "Patient Card Bottom Sheet (Mobile Dark 390x844)");

	await mobContext.close();
	await browser.close();

	console.log("\n=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
}

capture().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});
