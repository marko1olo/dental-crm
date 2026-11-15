/**
 * scripts/capture-perio-direct.mjs
 * Robust 4-State Visual Proof capture for Periodontal Studio SSOT
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "91d83097-4c0c-41c3-9dba-a136a34ce5fa";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);
const OUTPUT_DIR = path.resolve("docs/proofs/perio");
const OUTPUT_DIR_PERIODONTICS = path.resolve("docs/proofs/periodontics");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR_PERIODONTICS, { recursive: true });
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
	console.log("[CAPTURE PERIO] Launching browser...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-web-security"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
		});
		const page = await context.newPage();

		page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log("[PAGE CONSOLE ERROR]:", msg.text());
			}
		});

		await page.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
			localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_showcase_mode_v1", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Смирнов А.П.",
				role: "doctor",
			}));
		});

		const baseUrl = "http://127.0.0.1:5173/?demo=true#perio";
		console.log(`[CAPTURE PERIO] Navigating to ${baseUrl} with waitUntil: commit...`);
		await page.goto(baseUrl, {
			waitUntil: "commit",
			timeout: 30000,
		});

		console.log("[CAPTURE PERIO] Waiting 5s for React app to mount...");
		await page.waitForTimeout(5000);

		console.log("[CAPTURE PERIO] Dispatching dente:open-perio and dente:open-perio-modal...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-perio", {
				detail: { patientName: "Пациент приёма (Пародонтология)", patientId: "demo_perio_patient" },
			}));
			window.dispatchEvent(new CustomEvent("dente:open-perio-modal", {
				detail: { patientName: "Пациент приёма (Пародонтология)", patientId: "demo_perio_patient" },
			}));
		});

		const selector = '[data-testid="interactive-periodontogram"], [data-testid="perio-save-draft-btn"], [data-testid="perio-preset-norm-btn"], [data-testid="perio-studio-modal"]';
		try {
			await page.waitForSelector(selector, { timeout: 10000 });
			console.log("[CAPTURE PERIO] Perio studio successfully detected via selector!");
		} catch (e) {
			console.log("[CAPTURE PERIO] Selector wait timeout, checking DOM and trying fallback click...");
			await page.evaluate(() => {
				const btn = document.querySelector('[data-testid="open-perio-btn"], [data-testid="nav-perio"]');
				if (btn) btn.click();
			});
			await page.waitForTimeout(2000);
		}

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
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("theme", th);
			}, state.theme);

			// Стабилизация шрифтов
			await page.evaluate(async () => {
				if (document.fonts?.ready) await document.fonts.ready;
			});
			await page.waitForTimeout(800);

			const filename = `${state.id}.png`;
			const targetPath = path.join(OUTPUT_DIR, filename);
			const periodonticsPath = path.join(OUTPUT_DIR_PERIODONTICS, filename);
			const brainPath = path.join(BRAIN_DIR, filename);

			await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
			fs.copyFileSync(targetPath, periodonticsPath);
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
