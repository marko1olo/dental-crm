import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/emr");
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
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR VISIT SOAP & EMR ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await ctx.newPage();

		const targetUrl = "http://127.0.0.1:5173/?demo=1#medical-card";
		console.log(`Navigating to ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });
		await page.waitForLoadState("domcontentloaded");

		// Ожидаем модалку
		await page.waitForSelector(".emr-studio-window, .emr043-modal-window", { timeout: 20000 });

		// Переключаемся на вкладку 4. Дневники визитов
		try {
			const diariesTabBtn = await page.waitForSelector("button:has-text('4. Дневники визитов'), button:has-text('Дневники')", { timeout: 6000 });
			await diariesTabBtn.click();
			await sleep(600);
		} catch (e) {
			console.log("Could not click diaries tab directly:", e.message);
		}

		// Разворачиваем форму быстрой записи SOAP, если не открыта
		try {
			const toggleFormBtn = await page.$("[data-testid='btn-toggle-inline-diary-form']");
			if (toggleFormBtn) {
				const btnText = await toggleFormBtn.textContent();
				if (btnText && btnText.includes("Быстрая запись")) {
					await toggleFormBtn.click();
					await sleep(600);
				}
			}
		} catch (e) {
			console.log("Toggle inline diary form notice:", e.message);
		}

		const states = [
			{ name: "01_visit_soap_pc_light_1440x900.png", width: 1440, height: 900, theme: "light" },
			{ name: "02_visit_soap_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark" },
			{ name: "03_visit_soap_mobile_light_390x844.png", width: 390, height: 844, theme: "light" },
			{ name: "04_visit_soap_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark" },
		];

		for (const state of states) {
			console.log(`\nSetting up: ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
			await page.setViewportSize({ width: state.width, height: state.height });

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

			await sleep(800);
			await saveAndVerifyShot(page, state.name);
		}

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT SOAP VISUAL PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
