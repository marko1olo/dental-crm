import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const PORTAL_PROOFS_DIR = path.resolve("docs/proofs/portal");
const BRAIN_PROOFS_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/69cb45a3-13eb-41e0-9edf-bc5dcef5ebce/proofs");

fs.mkdirSync(PORTAL_PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_PROOFS_DIR, { recursive: true });

async function saveProof(page, targetDir, fileName) {
	const p1 = path.join(targetDir, fileName);
	await page.screenshot({ path: p1, fullPage: false });
	const p2 = path.join(BRAIN_PROOFS_DIR, fileName);
	fs.copyFileSync(p1, p2);

	const stats = fs.statSync(p1);
	console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
	if (stats.size < 20480) {
		throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
	}
	return p1;
}

async function main() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	console.log("Using browser executable:", browserPath);
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		console.log("\n--- PATIENT CABINET 4-STATE PROOFS ---");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();

		console.log("Navigating to live public booking page...");
		await page.goto(`${WEB_BASE}/#/book`, {
			waitUntil: "commit",
			timeout: 20000,
		});

		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...");
		}, { timeout: 30000 }).catch(() => {});

		await page.waitForTimeout(1000);

		// Switch to Cabinet Mode tab if available
		const cabinetTabBtn = await page.$('button:has-text("Личный кабинет")');
		if (cabinetTabBtn) {
			await cabinetTabBtn.click();
			await page.waitForTimeout(600);
		}

		// Click open test-drive / demo cabinet button
		const openCabinetBtn = await page.$('[data-testid="open-demo-cabinet-btn"]');
		if (openCabinetBtn) {
			await openCabinetBtn.click();
			await page.waitForTimeout(800);
		}

		// Wait for patient cabinet modal
		await page.waitForSelector(".patient-cabinet-modal, .patient-cabinet-body, [data-testid='patient-cabinet-modal']", {
			state: "visible",
			timeout: 10000,
		}).catch(() => {});

		// 1. PC Light (1440x900)
		console.log("Capturing 01_patient_cabinet_pc_light.png...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(600);
		await saveProof(page, PORTAL_PROOFS_DIR, "01_patient_cabinet_pc_light.png");

		// 2. PC Dark (1440x900)
		console.log("Capturing 02_patient_cabinet_pc_dark.png...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(600);
		await saveProof(page, PORTAL_PROOFS_DIR, "02_patient_cabinet_pc_dark.png");

		// 3. Mobile Light (390x844)
		console.log("Capturing 03_patient_cabinet_mobile_light.png...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(600);
		await saveProof(page, PORTAL_PROOFS_DIR, "03_patient_cabinet_mobile_light.png");

		// 4. Mobile Dark (390x844)
		console.log("Capturing 04_patient_cabinet_mobile_dark.png...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(600);
		await saveProof(page, PORTAL_PROOFS_DIR, "04_patient_cabinet_mobile_dark.png");

		await context.close();
		console.log("\n>>> PATIENT CABINET 4-STATE PROOFS SUCCESSFULLY CAPTURED! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
