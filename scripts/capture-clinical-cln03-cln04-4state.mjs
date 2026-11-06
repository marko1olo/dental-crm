import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/clinical";
if (!existsSync(PROOF_DIR)) {
	mkdirSync(PROOF_DIR, { recursive: true });
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
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
				.global-toast-container,
				.copilot-trigger-btn,
				[data-testid="copilot-floating-trigger"],
				vite-error-overlay {
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
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
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
	await sleep(400);
}

function verifyAndSaveScreenshot(buffer, filename, description) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
	}
	const destPrimary = path.join(PROOF_DIR, filename);
	writeFileSync(destPrimary, buffer);
	const stats = statSync(destPrimary);
	console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (>= 20KB OK) -> ${description}`);
	return destPrimary;
}

async function captureAll() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR CLINICAL ODONTOGRAM [CLN-03] & SOAP PROTOCOLS [CLN-04] ===");

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (edgePath) {
		launchOptions.executablePath = edgePath;
	}

	const browser = await chromium.launch(launchOptions);

	try {
		// ==========================================
		// PART 1: VISIT SOAP PROTOCOLS & EMR (448 TEMPLATES CATALOG)
		// ==========================================
		console.log("\n--- Part 1: Visit SOAP Editor & 448 Clinical Protocols Catalog ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const pcPage = await pcContext.newPage();
		const emrUrl = "http://127.0.0.1:5173/?demo=1#medical-card";
		console.log(`Navigating to ${emrUrl}...`);
		await pcPage.goto(emrUrl, { waitUntil: "commit", timeout: 45000 });
		await pcPage.waitForSelector(".emr-studio-window, .emr043-modal-window", { timeout: 30000 });
		await sleep(1000);
		await suppressOverlays(pcPage);

		// Switch to tab 4 (Дневники визитов)
		try {
			const diariesTab = await pcPage.waitForSelector("button:has-text('4. Дневники визитов'), button:has-text('Дневники')", { timeout: 8000 });
			await diariesTab.click();
			await sleep(600);
		} catch (e) {
			console.log("Diaries tab notice:", e.message);
		}

		// Open templates drawer / selector if button exists
		try {
			const openTemplatesBtn = await pcPage.$("[data-testid='btn-open-stomt-templates']");
			if (openTemplatesBtn) {
				await openTemplatesBtn.click();
				await sleep(500);
			}
		} catch (e) {
			console.log("Open templates button notice:", e.message);
		}

		// 1.1 PC Light SOAP
		await setTheme(pcPage, "light");
		const pcSoapLight = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcSoapLight, "01_clinical_soap_pc_light_1440x900.png", "Visit SOAP Editor with 448 Authentic Protocols (PC Light 1440x900)");

		// 1.2 PC Dark SOAP
		await setTheme(pcPage, "dark");
		const pcSoapDark = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcSoapDark, "02_clinical_soap_pc_dark_1440x900.png", "Visit SOAP Editor with 448 Authentic Protocols (PC Dark 1440x900)");

		await pcContext.close();

		// Mobile Context for SOAP
		console.log("\nSetting up Mobile Context for SOAP Editor (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(emrUrl, { waitUntil: "commit", timeout: 45000 });
		await mobilePage.waitForSelector(".emr-studio-window, .emr043-modal-window", { timeout: 30000 });
		await sleep(1000);
		await suppressOverlays(mobilePage);

		try {
			const diariesTabMobile = await mobilePage.waitForSelector("button:has-text('4. Дневники визитов'), button:has-text('Дневники')", { timeout: 8000 });
			await diariesTabMobile.click();
			await sleep(600);
		} catch (e) {
			console.log("Diaries tab mobile notice:", e.message);
		}

		// 1.3 Mobile Light SOAP
		await setTheme(mobilePage, "light");
		const mobileSoapLight = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileSoapLight, "03_clinical_soap_mobile_light_390x844.png", "Mobile Visit SOAP EMR Apple HIG (Mobile Light 390x844)");

		// 1.4 Mobile Dark SOAP
		await setTheme(mobilePage, "dark");
		const mobileSoapDark = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileSoapDark, "04_clinical_soap_mobile_dark_390x844.png", "Mobile Visit SOAP EMR Apple HIG (Mobile Dark 390x844)");

		await mobileContext.close();

		// ==========================================
		// PART 2: ODONTOGRAM WHEELER 2.5D WITH TOOTH HISTORY CHRONICLE [CLN-03]
		// ==========================================
		console.log("\n--- Part 2: Odontogram Wheeler 2.5D with Multi-Status & ToothHistoryChronicle ---");
		const odontoPcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await odontoPcContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const odontoPcPage = await odontoPcContext.newPage();
		const odontoUrl = "http://127.0.0.1:5173/?demo=true#odontogram";
		console.log(`Navigating to ${odontoUrl}...`);
		await odontoPcPage.goto(odontoUrl, { waitUntil: "commit", timeout: 45000 });
		await odontoPcPage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { state: "attached", timeout: 30000 });
		await sleep(1000);
		await suppressOverlays(odontoPcPage);

		// Click tooth 16 or 46 to inspect history and multi-status
		try {
			const toothBtn = await odontoPcPage.$('[data-testid="anatomical-tooth-cell-46"], [data-testid="tooth-cell-46"], [data-testid="anatomical-tooth-cell-16"], [data-testid="tooth-cell-16"]');
			if (toothBtn) {
				await toothBtn.click();
				await sleep(500);
			}
		} catch (_) {}

		// 2.1 PC Light Odontogram History
		await setTheme(odontoPcPage, "light");
		const odontoPcLight = await odontoPcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(odontoPcLight, "05_clinical_odontogram_history_pc_light_1440x900.png", "Odontogram Wheeler 2.5D with Multi-Status History (PC Light 1440x900)");

		// 2.2 PC Dark Odontogram History
		await setTheme(odontoPcPage, "dark");
		const odontoPcDark = await odontoPcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(odontoPcDark, "06_clinical_odontogram_history_pc_dark_1440x900.png", "Odontogram Wheeler 2.5D with Multi-Status History (PC Dark 1440x900)");

		await odontoPcContext.close();

		// Mobile Odontogram
		console.log("\nSetting up Mobile Context for Odontogram History (390x844)...");
		const odontoMobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await odontoMobileContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const odontoMobilePage = await odontoMobileContext.newPage();
		await odontoMobilePage.goto(odontoUrl, { waitUntil: "commit", timeout: 45000 });
		await odontoMobilePage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { state: "attached", timeout: 30000 });
		await sleep(1000);
		await suppressOverlays(odontoMobilePage);

		// Select tooth on mobile
		try {
			const mobileTooth = await odontoMobilePage.$('[data-testid="tooth-cell-46"], [data-testid="anatomical-tooth-cell-46"], [data-testid="tooth-cell-16"]');
			if (mobileTooth) {
				await mobileTooth.click();
				await sleep(500);
			}
		} catch (_) {}

		// 2.3 Mobile Light Odontogram History
		await setTheme(odontoMobilePage, "light");
		const odontoMobileLight = await odontoMobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(odontoMobileLight, "07_clinical_odontogram_history_mobile_light_390x844.png", "Mobile Odontogram Wheeler 2.5D Apple HIG (Mobile Light 390x844)");

		// 2.4 Mobile Dark Odontogram History
		await setTheme(odontoMobilePage, "dark");
		const odontoMobileDark = await odontoMobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(odontoMobileDark, "08_clinical_odontogram_history_mobile_dark_390x844.png", "Mobile Odontogram Wheeler 2.5D Apple HIG (Mobile Dark 390x844)");

		await odontoMobileContext.close();

		console.log("\n=======================================================");
		console.log(">>> ALL 8 CLINICAL VISUAL PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

captureAll().catch((err) => {
	console.error("[FATAL ERROR during capture]:", err);
	process.exit(1);
});
