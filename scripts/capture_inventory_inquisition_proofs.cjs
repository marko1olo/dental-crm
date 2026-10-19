const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\6a3f4e3b-f7f0-4c64-a2a5-fb7cbdee4082";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\inventory";
const APP_BASE = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function loginAndNavigateToInventory(page) {
	console.log("   Navigating to base URL...");
	await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await wait(2000);

	console.log("   Checking for quick demo login...");
	const quickBtn = await page.waitForSelector('button:has-text("Быстрый вход в Демо-тур")', { timeout: 15000 }).catch(() => null);
	if (quickBtn) {
		console.log("   Clicking 'Быстрый вход в Демо-тур'...");
		await quickBtn.click();
		await wait(2000);
	}

	console.log("   Checking for role entry button...");
	const enterBtn = await page.waitForSelector('button:has-text("Войти в демо-тур как")', { timeout: 10000 }).catch(() => null);
	if (enterBtn) {
		console.log("   Clicking role entry button...");
		await enterBtn.click();
		await wait(4000);
	}

	console.log("   Switching to #inventory...");
	await page.evaluate(() => {
		window.location.hash = "#inventory";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await wait(3000);
	await suppressOverlays(page);
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		if (document.body) {
			document.body.className = isDark ? "dark" : "light";
		}
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
	}, theme);
	await wait(600);
}

async function saveProof(page, filename, description) {
	const docPath = path.join(DOCS_DIR, filename);
	const brainPath = path.join(ARTIFACT_DIR, filename);
	await page.screenshot({ path: docPath, fullPage: false });
	fs.copyFileSync(docPath, brainPath);
	const stat = fs.statSync(docPath);
	if (stat.size < 20000) {
		console.warn(`[WARN] File ${filename} is suspiciously small: ${stat.size} bytes`);
	} else {
		console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) - ${description}`);
	}
}

async function run() {
	if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
	if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

	console.log("Launching Microsoft Edge for 4-State Visual Proofs...");
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("\n=== 1. PC DESKTOP (1440x900) ===");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
		const pcPage = await pcContext.newPage();
		await loginAndNavigateToInventory(pcPage);

		// PC Light
		console.log("Taking PC Light screenshot...");
		await applyTheme(pcPage, "light");
		await saveProof(pcPage, "inventory_pc_light_1440x900.png", "Live Inventory Table with Reorder Deficit Badge (PC Light 1440x900)");

		// PC Dark
		console.log("Taking PC Dark screenshot...");
		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "inventory_pc_dark_1440x900.png", "Live Inventory Table with Reorder Deficit Badge (PC Dark 1440x900)");

		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844 - iPhone 14 / Apple HIG)
		console.log("\n=== 2. MOBILE CONTEXT (390x844) ===");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobPage = await mobContext.newPage();
		await loginAndNavigateToInventory(mobPage);

		// Mobile Light
		console.log("Taking Mobile Light screenshot...");
		await applyTheme(mobPage, "light");
		await saveProof(mobPage, "inventory_mobile_light_390x844.png", "Mobile Inventory Grouped List with Touch Ergonomics (Mobile Light 390x844)");

		// Mobile Dark
		console.log("Taking Mobile Dark screenshot...");
		await applyTheme(mobPage, "dark");
		await saveProof(mobPage, "inventory_mobile_dark_390x844.png", "Mobile Inventory Grouped List with Touch Ergonomics (Mobile Dark 390x844)");

		await mobContext.close();

		console.log("\nAll 4 visual proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Execution failed:", err);
	process.exit(1);
});
