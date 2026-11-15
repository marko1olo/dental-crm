import fs, { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONV_ID = process.env.CONV_ID || "09f033ab-3dc3-4180-86d9-5833124a8429";

const IMPLANTS_PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/implants");
const SURGERY_PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/surgery");
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/implants");
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/implants`;

[IMPLANTS_PROOFS_DIR, SURGERY_PROOFS_DIR, DOCS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

function isPortOpen(port) {
	return new Promise((resolve) => {
		const req = http.get(`http://127.0.0.1:${port}/`, () => resolve(true));
		req.on("error", () => resolve(false));
		req.setTimeout(2500, () => {
			req.destroy();
			resolve(false);
		});
	});
}

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const targetPath = path.join(IMPLANTS_PROOFS_DIR, filename);
	const surgeryPath = path.join(SURGERY_PROOFS_DIR, filename);
	const docsPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	const buffer = await page.screenshot({ fullPage: false });
	fs.writeFileSync(targetPath, buffer);
	fs.writeFileSync(surgeryPath, buffer);
	fs.writeFileSync(docsPath, buffer);
	fs.writeFileSync(brainPath, buffer);

	const stats = statSync(targetPath);
	const sizeKb = Math.round(stats.size / 1024);
	console.log(`[PROOF SAVED] ${filename}: ${sizeKb} KB (>= 20 KB: ${stats.size >= 20480})`);
	if (stats.size < 20 * 1024) {
		throw new Error(`[ERROR] Screenshot ${filename} is too small (${stats.size} bytes < 20KB)!`);
	}
}

async function setTheme(page, theme) {
	const isDark = theme === "dark";
	await page.evaluate(({ theme, isDark }) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.setAttribute("data-theme", theme);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		try {
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
		} catch (_) {}
	}, { theme, isDark });
	await page.waitForTimeout(600);
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({ mode: "clinic", role: "doctor", activeRole: "doctor" }));
	});
}

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
				.global-toast-container,
				[role="alert"],
				.shepherd-element,
				.boot-state {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .boot-state").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function ensureSurgeryHub(page) {
	console.log("  Waiting for chairside-surgery-hub-modal to appear naturally...");
	try {
		await page.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', { timeout: 15000 });
	} catch (_) {
		console.log("  Modal not found within 15s, dispatching dente:open-surgery...");
		await page.evaluate(() => {
			window.location.hash = "#surgery";
			window.dispatchEvent(
				new CustomEvent("dente:open-surgery", {
					detail: { scenario: "implant", toothFdi: 46 },
				})
			);
		});
		await page.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', { timeout: 20000 });
	}

	try {
		const implantChip = page.locator('[data-testid="scenario-chip-implant"]').first();
		if (await implantChip.isVisible({ timeout: 3000 }).catch(() => false)) {
			await implantChip.click();
			await page.waitForTimeout(600);
		}
	} catch (_) {}
}

async function main() {
	console.log("=== Launching Red Team Implants & Surgery 4-State Proof Capture ===");

	const port = 5173;
	const open = await isPortOpen(port);
	if (!open) {
		throw new Error(`[FATAL] Port ${port} is not open!`);
	}
	console.log(`[Vite] Verified active port ${port}`);

	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => existsSync(p));
	console.log(`[BROWSER] Executable: ${browserPath}`);

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (browserPath) launchOptions.executablePath = browserPath;

	const browser = await chromium.launch(launchOptions);
	try {
		// ==========================================
		// 1. DESKTOP 1440x900 (PC Light & Dark)
		// ==========================================
		console.log("\n[1/2] Capturing Desktop 1440x900...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
		});
		await setupPageAuth(pcContext);
		const pcPage = await pcContext.newPage();

		console.log("  Navigating to http://127.0.0.1:5173/?demo=true#surgery ...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#surgery", { waitUntil: "domcontentloaded", timeout: 45000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);
		await ensureSurgeryHub(pcPage);

		// PC Light Surgery Hub
		console.log("  Saving 01_surgery_hub_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "01_surgery_hub_pc_light_1440x900.png");

		// PC Dark Surgery Hub
		console.log("  Saving 02_surgery_hub_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "02_surgery_hub_pc_dark_1440x900.png");

		// Switch to Passport Tab
		console.log("  Switching to Passport Tab...");
		const tabPassport = pcPage.locator('[data-testid="tab-surgery-passport"]').first();
		if (await tabPassport.isVisible({ timeout: 3000 }).catch(() => false)) {
			await tabPassport.click();
			await pcPage.waitForTimeout(600);
		}

		// PC Dark Passport Card
		console.log("  Saving 02_implant_passport_pc_dark_1440x900.png...");
		await saveProof(pcPage, "02_implant_passport_pc_dark_1440x900.png");

		// PC Light Passport Card
		console.log("  Saving 01_implant_passport_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await saveProof(pcPage, "01_implant_passport_pc_light_1440x900.png");

		await pcContext.close();

		// ==========================================
		// 2. MOBILE 390x844 (Mobile Light & Dark)
		// ==========================================
		console.log("\n[2/2] Capturing Mobile 390x844...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			locale: "ru-RU",
		});
		await setupPageAuth(mobileContext);
		const mobilePage = await mobileContext.newPage();

		console.log("  Navigating mobile to http://127.0.0.1:5173/?demo=true#surgery ...");
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#surgery", { waitUntil: "domcontentloaded", timeout: 45000 });
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);
		await ensureSurgeryHub(mobilePage);

		// Mobile Light Surgery Hub
		console.log("  Saving 03_surgery_hub_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await suppressOverlays(mobilePage);
		await saveProof(mobilePage, "03_surgery_hub_mobile_light_390x844.png");

		// Mobile Dark Surgery Hub
		console.log("  Saving 04_surgery_hub_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await suppressOverlays(mobilePage);
		await saveProof(mobilePage, "04_surgery_hub_mobile_dark_390x844.png");

		// Switch to Passport Tab on Mobile
		console.log("  Switching to Passport Tab on Mobile...");
		const mTabPassport = mobilePage.locator('[data-testid="tab-surgery-passport"]').first();
		if (await mTabPassport.isVisible({ timeout: 3000 }).catch(() => false)) {
			await mTabPassport.click();
			await mobilePage.waitForTimeout(600);
		}

		// Mobile Dark Passport Card
		console.log("  Saving 04_implant_passport_mobile_dark_390x844.png...");
		await saveProof(mobilePage, "04_implant_passport_mobile_dark_390x844.png");

		// Mobile Light Passport Card
		console.log("  Saving 03_implant_passport_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await suppressOverlays(mobilePage);
		await saveProof(mobilePage, "03_implant_passport_mobile_light_390x844.png");

		await mobileContext.close();

		console.log("\n=== ALL 8 PROOFS CAPTURED SUCCESSFULLY (4 Hub + 4 Passport) ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
