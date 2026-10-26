import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/medical_record");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveAndVerifyShot(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(proofPath).size;
	if (size < 20480) {
		throw new Error(`[BYTE-GUARD FAILED]: ${fileName} size is ${size} bytes (<20KB)`);
	}
	console.log(`[PROOF VERIFIED]: ${fileName} (${(size / 1024).toFixed(1)} KB)`);
}

async function capture() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR MEDICAL RECORD (EMR) ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const states = [
			{ name: "01_medical_record_pc_light.png", width: 1440, height: 900, theme: "light", isMobile: false },
			{ name: "02_medical_record_pc_dark.png", width: 1440, height: 900, theme: "dark", isMobile: false },
			{ name: "03_medical_record_mobile_light.png", width: 390, height: 844, theme: "light", isMobile: true },
			{ name: "04_medical_record_mobile_dark.png", width: 390, height: 844, theme: "dark", isMobile: true },
		];

		for (const state of states) {
			console.log(`\nCapturing: ${state.name} (${state.width}x${state.height}, ${state.theme}, mobile: ${state.isMobile})...`);

			const contextOpts = {
				viewport: { width: state.width, height: state.height },
			};
			if (state.isMobile) {
				Object.assign(contextOpts, devices["iPhone 13"]);
			}

			const ctx = await browser.newContext(contextOpts);
			const page = await ctx.newPage();

			// Пробуем подключиться к живому приложению
			const targetUrl = `http://127.0.0.1:5173/?demo=1#medical-card`;
			console.log(`Navigating to ${targetUrl}...`);

			await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

			// Устанавливаем тему в localStorage и на <html>
			await page.evaluate((theme) => {
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
				document.documentElement.setAttribute("data-theme", theme);
				if (theme === "dark") {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
			}, state.theme);

			// Ожидаем отрисовки модалки
			try {
				await page.waitForSelector(".emr043-modal-window", { timeout: 12000 });
			} catch (e) {
				console.log("Waiting for trigger or alternate selector...");
				// Если окно не открылось автоматически по hash, открываем программно через window.location.hash
				await page.evaluate(() => {
					window.location.hash = "medical-card";
				});
				await page.waitForSelector(".emr043-modal-window", { timeout: 15000 });
			}

			await sleep(1500);

			await saveAndVerifyShot(page, state.name);
			await ctx.close();
		}

		console.log("\n=======================================================");
		console.log(">>> ALL 4 MEDICAL RECORD VISUAL PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
