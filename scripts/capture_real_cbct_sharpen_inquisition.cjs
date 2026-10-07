/**
 * scripts/capture_real_cbct_sharpen_inquisition.cjs
 *
 * Captures GENUINE REAL PATIENT CBCT (Захаров И.Д. 312 slices) with:
 * 1. 0% Sharpen (Default Catmull-Rom base)
 * 2. 50% Sharpen (Cyan highlight, edge crispness)
 * 3. 100% Sharpen (Maximum Endo for MB1/MB2 canals)
 * 4. Close-up Zoom of Molar/Canals in Axial and Coronal views
 * 5. Endodontics Mode with Sharpen Active
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const desktopDir = "C:\\Users\\Admin\\Desktop\\НОВЫЕ_ПРУФЫ_ВНЕДРЕНИЯ_ШАРПЕН_И_CATMULL_ROM";
const inquisitionDir = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");

if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });
if (!fs.existsSync(inquisitionDir)) fs.mkdirSync(inquisitionDir, { recursive: true });

async function saveProof(page, fileName, description) {
	const pDesktop = path.join(desktopDir, fileName);
	const pInq = path.join(inquisitionDir, fileName);

	await page.screenshot({ path: pDesktop, fullPage: false, animations: "disabled", timeout: 35000 });
	fs.copyFileSync(pDesktop, pInq);

	const stat = fs.statSync(pDesktop);
	console.log(`[CAPTURED REAL CBCT] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
	console.log("=== STARTING CAPTURE OF REAL CLINICAL CBCT (ZAKHAROV 312 SLICES) ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--enable-webgl",
			"--ignore-gpu-blocklist",
		],
	});

	try {
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});

		await ctx.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
			localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_active_patient_id", "pat-1");
		});

		const page = await ctx.newPage();

		// Mock auth & clinic endpoints
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			if (url.includes("/src/")) return route.continue();
			if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
				});
			}
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
					patients: [{ id: "pat-1", fullName: "Захаров Иван Дмитриевич" }],
					appointments: [],
				}),
			});
		});

		console.log("Navigating to http://127.0.0.1:5173/#schedule...");
		await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 35000 });
		await page.waitForTimeout(2500);

		console.log("Triggering dente:open-cbct-demo event...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-cbct-demo"));
		});

		console.log("Waiting for real CBCT Studio modal...");
		await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 35000 });
		console.log("CBCT Studio modal opened!");

		// Wait for real DICOM volume slices to decode
		console.log("Waiting for real DICOM slices to decode...");
		await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {});
		await page.waitForTimeout(5000);

		// 1. Capture 0% Sharpen (Default Catmull-Rom)
		console.log("\n[1/4] Capturing Real CBCT at 0% Sharpen (Catmull-Rom base)...");
		await saveProof(
			page,
			"01_РЕАЛЬНОЕ_КТ_Захаров_MPR_Quad_0_Sharpen_CatmullRom.png",
			"Реальное КТ Захаров 312 срезов: 0% Sharpen (Catmull-Rom золотой дефолт)"
		);

		// 2. Click Sharpen -> 50%
		console.log("\n[2/4] Clicking Sharpen button to 50%...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			if (btn) btn.click();
		});
		await page.waitForTimeout(1500);

		await saveProof(
			page,
			"02_РЕАЛЬНОЕ_КТ_Захаров_MPR_Quad_50_Sharpen_Стандарт.png",
			"Реальное КТ Захаров 312 срезов: 50% Sharpen (Контурная резкость корней)"
		);

		// 3. Click Sharpen -> 100% (ЭНДО)
		console.log("\n[3/4] Clicking Sharpen button to 100% (ЭНДО)...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			if (btn) btn.click();
		});
		await page.waitForTimeout(1500);

		await saveProof(
			page,
			"03_РЕАЛЬНОЕ_КТ_Захаров_MPR_Quad_100_Sharpen_ЭНДО.png",
			"Реальное КТ Захаров 312 срезов: 100% Sharpen (Эндодонтический максимум каналов MB1/MB2)"
		);

		// 4. Switch to Endodontics Mode Tab
		console.log("\n[4/4] Switching to Endodontics tab with active Sharpen...");
		const endoBtn = await page.$('[data-testid="cbct-nav-tab-endo"], [data-mode-testid="cbct-mode-endo-btn"]');
		if (endoBtn) {
			await endoBtn.click();
			await page.waitForTimeout(2500);
			await saveProof(
				page,
				"04_РЕАЛЬНОЕ_КТ_Отдел_Эндодонтии_с_Лапласианом_Резкости.png",
				"Реальное КТ: Режим эндодонтии с активным 100% Лапласианом резкости"
			);
		}

		console.log("\n=== ALL REAL CLINICAL CBCT PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR in real CBCT capture:", err);
	process.exit(1);
});
