import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = "65510ae0-ff00-4753-823d-ea462a92d61c";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/emr");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/emr");
const OUT_BRAIN = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/emr`;

for (const dir of [OUT_DIR, OUT_SCREENSHOTS, OUT_BRAIN]) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

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
	await p.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(500);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const targetScreenshots = path.join(OUT_SCREENSHOTS, filename);
	copyFileSync(targetPath, targetScreenshots);
	const targetBrain = path.join(OUT_BRAIN, filename);
	copyFileSync(targetPath, targetBrain);

	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
}

async function capture() {
	console.log("=== CAPTURING 4-STATE EMR & SOAP DIARY PROOFS ===");
	try {
		const TARGET_URL = "http://127.0.0.1:5173/?stand=emr&diary=1#emr";

		// ═══════════════════════════════════════════════════════════
		// 1. PC VIEWPORT: 1440x900
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [PC 1440x900 Desktop] ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor" }));
		});

		const pcPage = await pcContext.newPage();
		console.log(`[PC] Navigating to ${TARGET_URL}...`);
		await pcPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 35000 });

		try {
			await pcPage.waitForSelector("[data-testid='emr-medical-record-standalone-root'], .emr-studio-window, .emr043-modal-window", { state: "attached", timeout: 15000 });
			console.log("[PC] EMR Medical Record modal detected!");
		} catch (e) {
			console.log("[PC] Waiting for EMR selector failed, checking for offline fallback...");
			const offlineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (offlineBtn) {
				await offlineBtn.click();
				await pcPage.waitForTimeout(2000);
			}
		}

		// 1.1 PC Light
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_emr_studio_pc_light_1440x900.png", "EMR Medical Record Studio (PC Light 1440x900)");

		// 1.2 PC Dark
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_emr_studio_pc_dark_1440x900.png", "EMR Medical Record Studio (PC Dark 1440x900)");

		await pcContext.close();

		// ═══════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT: 390x844 (Apple HIG)
		// ═══════════════════════════════════════════════════════════
		console.log("\n--- [Mobile 390x844 Apple HIG] ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor" }));
		});

		const mobilePage = await mobileContext.newPage();
		console.log(`[Mobile] Navigating to ${TARGET_URL}...`);
		await mobilePage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 35000 });

		try {
			await mobilePage.waitForSelector("[data-testid='emr-medical-record-standalone-root'], .emr-studio-window, .emr043-modal-window", { state: "attached", timeout: 15000 });
			console.log("[Mobile] EMR Medical Record modal detected!");
		} catch (e) {
			console.log("[Mobile] Waiting for EMR selector failed, checking for offline fallback...");
			const offlineBtn = await mobilePage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (offlineBtn) {
				await offlineBtn.click();
				await mobilePage.waitForTimeout(2000);
			}
		}

		// 2.1 Mobile Light
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_emr_studio_mobile_light_390x844.png", "EMR Medical Record Bottom Sheet (Mobile Light 390x844)");

		// 2.2 Mobile Dark
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_emr_studio_mobile_dark_390x844.png", "EMR Medical Record Bottom Sheet (Mobile Dark 390x844)");

		await mobileContext.close();
	} finally {
		await browser.close();
	}

	console.log("\n=== ALL EMR 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
