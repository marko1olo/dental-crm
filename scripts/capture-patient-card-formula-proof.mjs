import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/181fddf2-210a-4374-abad-f6df15f65e66";

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
	executablePath: edgePath,
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
	await page.waitForTimeout(400);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const brainPath = path.join(BRAIN_DIR, filename);
	copyFileSync(targetPath, brainPath);
	console.log(`[PROOF CAPTURED] ${filename} -> ${description}`);
}

async function capture() {
	console.log("=== CAPTURING PATIENT CARD WHEELER FORMULA PROOFS ===");

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await context.addInitScript(() => {
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
	});

	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/?demo=true#patient-card", { waitUntil: "domcontentloaded" });
	await page.waitForSelector("[data-testid='patient-card-modal']", { state: "attached", timeout: 20000 });
	await page.waitForTimeout(1000);
	await suppressOverlays(page);

	// Кликаем по вкладке "Формула" (data-testid='tab-patient-formula')
	const teethTab = page.locator("[data-testid='tab-patient-formula']").first();
	if (await teethTab.count()) {
		await teethTab.click();
		await page.waitForTimeout(1200);
	}

	// 1. PC Light
	await setTheme(page, "light");
	await saveProof(page, "06_patient_card_formula_pc_light.png", "Patient Card Wheeler Dental Arch (PC Light 1440x900)");

	// 2. PC Dark
	await setTheme(page, "dark");
	await saveProof(page, "07_patient_card_formula_pc_dark.png", "Patient Card Wheeler Dental Arch (PC Dark 1440x900)");

	await context.close();
	await browser.close();
	console.log("=== PATIENT CARD WHEELER PROOFS READY ===");
}

capture().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});
