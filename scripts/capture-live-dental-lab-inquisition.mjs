import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function captureLiveDentalLabProof() {
	const proofsDir = path.resolve(__dirname, "../docs/proofs/dental_lab");
	fs.mkdirSync(proofsDir, { recursive: true });

	console.log("=== Launching Playwright for LIVE CRM Dental Lab Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. PC 1440x900 LIGHT
		console.log("Capturing 01_dental_lab_pc_light.png...");
		const pcLightContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcLight = await pcLightContext.newPage();
		await pcLight.goto("http://127.0.0.1:5173/?standalone=dental_lab#lab", {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await pcLight.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await pcLight.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
		await pcLight.waitForTimeout(1000);
		const p1 = path.join(proofsDir, "01_dental_lab_pc_light.png");
		await pcLight.screenshot({ path: p1, fullPage: false, animations: "disabled" });
		console.log(`✓ Saved ${p1} (${(fs.statSync(p1).size / 1024).toFixed(1)} KB)`);
		await pcLightContext.close();

		// 2. PC 1440x900 DARK
		console.log("Capturing 02_dental_lab_pc_dark.png...");
		const pcDarkContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcDark = await pcDarkContext.newPage();
		await pcDark.goto("http://127.0.0.1:5173/?standalone=dental_lab#lab", {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await pcDark.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await pcDark.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
		await pcDark.waitForTimeout(1000);
		const p2 = path.join(proofsDir, "02_dental_lab_pc_dark.png");
		await pcDark.screenshot({ path: p2, fullPage: false, animations: "disabled" });
		console.log(`✓ Saved ${p2} (${(fs.statSync(p2).size / 1024).toFixed(1)} KB)`);
		await pcDarkContext.close();

		// 3. MOBILE 390x844 LIGHT
		console.log("Capturing 03_dental_lab_mobile_light.png...");
		const mobileLightContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobileLight = await mobileLightContext.newPage();
		await mobileLight.goto("http://127.0.0.1:5173/?standalone=dental_lab#lab", {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await mobileLight.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await mobileLight.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
		await mobileLight.waitForTimeout(1000);
		const p3 = path.join(proofsDir, "03_dental_lab_mobile_light.png");
		await mobileLight.screenshot({ path: p3, fullPage: false, animations: "disabled" });
		console.log(`✓ Saved ${p3} (${(fs.statSync(p3).size / 1024).toFixed(1)} KB)`);

		// 3b. MOBILE EXPRESS ORDER FORM LIGHT
		console.log("Capturing 03b_dental_lab_mobile_create_light.png...");
		const newOrderBtn = await mobileLight.$('button:has-text("+ Новый наряд"), button:has-text("+ Создать наряд у кресла")');
		if (newOrderBtn) {
			await newOrderBtn.click();
			await mobileLight.waitForTimeout(600);
			const p3b = path.join(proofsDir, "03b_dental_lab_mobile_create_light.png");
			await mobileLight.screenshot({ path: p3b, fullPage: false, animations: "disabled" });
			console.log(`✓ Saved ${p3b} (${(fs.statSync(p3b).size / 1024).toFixed(1)} KB)`);
		}
		await mobileLightContext.close();

		// 4. MOBILE 390x844 DARK
		console.log("Capturing 04_dental_lab_mobile_dark.png...");
		const mobileDarkContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobileDark = await mobileDarkContext.newPage();
		await mobileDark.goto("http://127.0.0.1:5173/?standalone=dental_lab#lab", {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await mobileDark.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await mobileDark.waitForSelector('[data-testid="dental-lab-studio-modal-root"]', { timeout: 15000 });
		await mobileDark.waitForTimeout(1000);
		const p4 = path.join(proofsDir, "04_dental_lab_mobile_dark.png");
		await mobileDark.screenshot({ path: p4, fullPage: false, animations: "disabled" });
		console.log(`✓ Saved ${p4} (${(fs.statSync(p4).size / 1024).toFixed(1)} KB)`);

		// 4b. MOBILE EXPRESS ORDER FORM DARK
		console.log("Capturing 04b_dental_lab_mobile_create_dark.png...");
		const newOrderDarkBtn = await mobileDark.$('button:has-text("+ Новый наряд"), button:has-text("+ Создать наряд у кресла")');
		if (newOrderDarkBtn) {
			await newOrderDarkBtn.click();
			await mobileDark.waitForTimeout(600);
			const p4b = path.join(proofsDir, "04b_dental_lab_mobile_create_dark.png");
			await mobileDark.screenshot({ path: p4b, fullPage: false, animations: "disabled" });
			console.log(`✓ Saved ${p4b} (${(fs.statSync(p4b).size / 1024).toFixed(1)} KB)`);
		}
		await mobileDarkContext.close();

		console.log("=== ALL 4 LIVE DENTAL LAB PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

captureLiveDentalLabProof().catch((err) => {
	console.error("FATAL in captureLiveDentalLabProof:", err);
	process.exit(1);
});
