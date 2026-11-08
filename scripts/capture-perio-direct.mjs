/**
 * scripts/capture-perio-direct.mjs
 * Robust 4-State Visual Proof capture for Periodontal Studio SSOT
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "452f18b6-bbbe-43cf-9895-fe5b3763e5e6";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);
const OUTPUT_DIR = path.resolve("docs/proofs/perio");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const STATES = [
	{
		id: "01_perio_studio_pc_light_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		id: "02_perio_studio_pc_dark_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
	{
		id: "03_perio_studio_mobile_light_390x844",
		viewport: { width: 390, height: 844 },
		theme: "light",
	},
	{
		id: "04_perio_studio_mobile_dark_390x844",
		viewport: { width: 390, height: 844 },
		theme: "dark",
	},
];

async function main() {
	console.log("[CAPTURE PERIO] Launching Chrome...");
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
		});
		const page = await context.newPage();

		console.log("[CAPTURE PERIO] Navigating to http://127.0.0.1:5173/?demo=true...");
		await page.goto("http://127.0.0.1:5173/?demo=true", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		// Ждем монтирования приложения
		await page.waitForTimeout(3000);

		console.log("[CAPTURE PERIO] Dispatching dente:open-perio event...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-perio", {
				detail: { patientName: "Пациент приёма (Пародонтология)", patientId: "demo_perio_patient" },
			}));
		});

		// Ждем селектора студии
		const selector = '[data-testid="interactive-periodontogram"], [data-testid="perio-save-draft-btn"]';
		await page.waitForSelector(selector, { timeout: 15000 });
		console.log("[CAPTURE PERIO] Perio studio successfully mounted!");

		// Захватываем все 4 состояния
		for (const state of STATES) {
			console.log(`[CAPTURE PERIO] Capturing ${state.id} (${state.theme}, ${state.viewport.width}x${state.viewport.height})...`);

			await page.setViewportSize(state.viewport);

			await page.evaluate((th) => {
				const html = document.documentElement;
				if (th === "dark") {
					html.classList.add("dark");
					html.setAttribute("data-theme", "dark");
					document.body.classList.add("dark");
				} else {
					html.classList.remove("dark");
					html.setAttribute("data-theme", "light");
					document.body.classList.remove("dark");
				}
			}, state.theme);

			// Стабилизация шрифтов
			await page.evaluate(async () => {
				if (document.fonts?.ready) await document.fonts.ready;
			});
			await page.waitForTimeout(500);

			const filename = `${state.id}.png`;
			const targetPath = path.join(OUTPUT_DIR, filename);
			const brainPath = path.join(BRAIN_DIR, filename);

			await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
			fs.copyFileSync(targetPath, brainPath);

			const size = fs.statSync(targetPath).size;
			console.log(`   ✓ Saved: ${filename} (${(size / 1024).toFixed(1)} KB)`);

			if (size < 20480) {
				throw new Error(`Screenshot ${filename} is smaller than 20KB threshold (${size} bytes)!`);
			}
		}

		console.log("[CAPTURE PERIO] All 4 states successfully captured!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[CAPTURE PERIO FATAL]:", err);
	process.exit(1);
});
