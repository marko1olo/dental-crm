import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/0d205b0c-780a-46c7-9caf-81cbddb00da2";

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

if (!edgePath) {
	console.error("Browser executable not found!");
	process.exit(1);
}

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
	console.log("=== CAPTURING 4-STATE CANONICAL WHEELER 2.5D PROOFS ===");

	// 1. PC CONTEXT (1440x900)
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const pcPage = await pcContext.newPage();
	await pcPage.goto("http://127.0.0.1:5173/?demo=true#odontogram", { waitUntil: "domcontentloaded" });
	await pcPage.waitForSelector("[data-testid='odontogram-studio-modal']", { state: "attached", timeout: 20000 });
	await pcPage.waitForTimeout(1200);
	await suppressOverlays(pcPage);

	// PC Light
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "01_odontogram_pc_light.png", "Odontogram Wheeler 2.5D Studio (PC Light 1440x900)");

	// PC Dark
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "02_odontogram_pc_dark.png", "Odontogram Wheeler 2.5D Studio (PC Dark 1440x900)");

	await pcContext.close();

	// 2. MOBILE CONTEXT (390x844)
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});

	const mobilePage = await mobileContext.newPage();
	await mobilePage.goto("http://127.0.0.1:5173/?demo=true#odontogram", { waitUntil: "domcontentloaded" });
	await mobilePage.waitForSelector("[data-testid='odontogram-studio-modal']", { state: "attached", timeout: 20000 });
	await mobilePage.waitForTimeout(1200);
	await suppressOverlays(mobilePage);

	// Mobile Light
	await setTheme(mobilePage, "light");
	await saveProof(mobilePage, "03_odontogram_mobile_light.png", "Odontogram Wheeler 2.5D Mobile (Mobile Light 390x844)");

	// Mobile Dark
	await setTheme(mobilePage, "dark");
	await saveProof(mobilePage, "04_odontogram_mobile_dark.png", "Odontogram Wheeler 2.5D Mobile (Mobile Dark 390x844)");

	await mobileContext.close();

	await browser.close();
	console.log("=== ALL WHEELER 2.5D PROOFS READY ===");
}

capture().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});
