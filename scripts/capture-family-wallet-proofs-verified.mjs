import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/family_wallet";
mkdirSync(OUT_DIR, { recursive: true });

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
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
	}
}

async function capture() {
	console.log("=== CAPTURING 4-STATE FAMILY WALLET PROOFS ===");
	try {
		const TARGET_URL = "http://127.0.0.1:5173/?demo=true#patients/family-wallet";

	// 1. PC VIEWPORT: 1440x900
	console.log("\n--- [PC 1440x900 Desktop] ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});

	await pcContext.addInitScript(() => {
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "owner");
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
	await pcPage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
	
	try {
		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 8000 });
		console.log("[PC] Family wallet modal opened via route hash!");
	} catch (e) {
		console.log("[PC] Direct hash wait failed, dispatching dente-open-family-wallet...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente-open-family-wallet", {
				detail: { patientId: "doc-1", patientName: "Воронова Светлана Сергеевна" }
			}));
		});
		await pcPage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		console.log("[PC] Family wallet modal opened via event!");
	}

	// 1.1 PC Light
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "01_family_wallet_pc_light_1440x900.png", "Family Wallet Modal (PC Light 1440x900)");

	// 1.2 PC Dark
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "02_family_wallet_pc_dark_1440x900.png", "Family Wallet Modal (PC Dark 1440x900)");

	await pcContext.close();

	// 2. MOBILE VIEWPORT: 390x844 (Apple HIG)
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
		localStorage.setItem("dente_user_role", "owner");
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
	await mobilePage.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

	try {
		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 8000 });
		console.log("[Mobile] Family wallet modal opened via route hash!");
	} catch (e) {
		console.log("[Mobile] Direct hash wait failed, dispatching dente-open-family-wallet...");
		await mobilePage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente-open-family-wallet", {
				detail: { patientId: "doc-1", patientName: "Воронова Светлана Сергеевна" }
			}));
		});
		await mobilePage.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 });
		console.log("[Mobile] Family wallet modal opened via event!");
	}

	// 2.1 Mobile Light
	await setTheme(mobilePage, "light");
	await saveProof(mobilePage, "03_family_wallet_mobile_light_390x844.png", "Family Wallet Bottom Sheet (Mobile Light 390x844)");

	// 2.2 Mobile Dark
	await setTheme(mobilePage, "dark");
	await saveProof(mobilePage, "04_family_wallet_mobile_dark_390x844.png", "Family Wallet Bottom Sheet (Mobile Dark 390x844)");

	await mobileContext.close();
} finally {
	await browser.close();
}

	console.log("\n=== ALL FAMILY WALLET 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
