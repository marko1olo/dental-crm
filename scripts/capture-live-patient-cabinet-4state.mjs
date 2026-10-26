import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const TARGET_DIR = path.resolve("docs/proofs/patient_portal");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b1ba38b0-8442-44e5-898a-30187c41a9cb/proofs");

fs.mkdirSync(TARGET_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function captureScreen(page, fileName, expectedMinSize = 40960) {
	const p1 = path.join(TARGET_DIR, fileName);
	await page.screenshot({ path: p1, fullPage: false });
	const p2 = path.join(BRAIN_DIR, fileName);
	fs.copyFileSync(p1, p2);

	const stats = fs.statSync(p1);
	console.log(`[CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
	if (stats.size < expectedMinSize) {
		throw new Error(`Screenshot ${fileName} is too small: ${stats.size} bytes < ${expectedMinSize} bytes`);
	}
	return p1;
}

async function main() {
	const browserPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		console.log("=== CAPTURING 4-STATE LIVE PATIENT CABINET PROOFS ===");

		// 1. PC VIEWPORT (1440x900)
		console.log("\n[PC LIGHT 1440x900]");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const pcPage = await pcContext.newPage();
		await pcPage.goto(`${WEB_BASE}/?demo=1#/portal/cabinet`, { waitUntil: "commit", timeout: 25000 });
		await pcPage.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...") && text.length > 50;
		}, { timeout: 35000 }).catch(() => {});
		await pcPage.waitForSelector('button[data-testid="open-demo-cabinet-btn"]', { state: "visible", timeout: 25000 });

		// Click open test-drive cabinet
		const openBtn = pcPage.locator('button[data-testid="open-demo-cabinet-btn"]');
		await openBtn.click();
		await pcPage.waitForSelector(".patient-cabinet-modal", { state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(1000);

		// Light Theme
		await pcPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		});
		await pcPage.waitForTimeout(600);
		await captureScreen(pcPage, "01_portal_pc_light.png", 40000);

		// Dark Theme
		console.log("\n[PC DARK 1440x900]");
		await pcPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
		});
		await pcPage.waitForTimeout(600);
		await captureScreen(pcPage, "02_portal_pc_dark.png", 40000);

		await pcContext.close();

		// 2. MOBILE VIEWPORT (390x844 - iPhone 14 / Apple HIG)
		console.log("\n[MOBILE LIGHT 390x844]");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			hasTouch: true,
			isMobile: true,
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(`${WEB_BASE}/?demo=1#/portal/cabinet`, { waitUntil: "commit", timeout: 25000 });
		await mobilePage.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...") && text.length > 50;
		}, { timeout: 35000 }).catch(() => {});
		await mobilePage.waitForSelector('button[data-testid="open-demo-cabinet-btn"]', { state: "visible", timeout: 25000 });

		const mobileOpenBtn = mobilePage.locator('button[data-testid="open-demo-cabinet-btn"]');
		await mobileOpenBtn.click();
		await mobilePage.waitForSelector(".patient-cabinet-modal", { state: "visible", timeout: 15000 });
		await mobilePage.waitForTimeout(1000);

		// Reset scroll positions to zero
		await mobilePage.evaluate(() => {
			window.scrollTo(0, 0);
			const backdrop = document.querySelector(".patient-cabinet-backdrop");
			if (backdrop) backdrop.scrollTop = 0;
			const modal = document.querySelector(".patient-cabinet-modal");
			if (modal) modal.scrollTop = 0;
		});

		// Mobile Light
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		});
		await mobilePage.waitForTimeout(600);
		await captureScreen(mobilePage, "03_portal_mobile_light.png", 40000);

		// Mobile Dark
		console.log("\n[MOBILE DARK 390x844]");
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
		});
		await mobilePage.waitForTimeout(600);
		await captureScreen(mobilePage, "04_portal_mobile_dark.png", 40000);

		await mobileContext.close();

		console.log("\n>>> ALL 4 PORTAL VISUAL PROOFS SUCCESSFULLY CAPTURED FROM LIVE STAND! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
