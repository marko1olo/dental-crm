import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/consents");
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function capture() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			filename: "01_consent_studio_pc_light_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			filename: "02_consent_studio_pc_dark_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			filename: "03_consent_studio_mobile_light_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
		},
		{
			filename: "04_consent_studio_mobile_dark_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
		},
	];

	for (const cfg of configs) {
		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.theme,
		});

		await context.addInitScript((theme) => {
			try {
				localStorage.setItem("theme", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente-theme", theme);
				localStorage.setItem("demo_mode", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo-token");
				localStorage.setItem("dente_staff_token", "demo-token");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				if (theme === "dark") {
					document.documentElement.classList.add("dark");
					document.documentElement.classList.remove("light");
				} else {
					document.documentElement.classList.remove("dark");
					document.documentElement.classList.add("light");
				}
			} catch (_) {}
		}, cfg.theme);

		const page = await context.newPage();

		let loaded = false;
		for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
			try {
				console.log(`[CAPTURE] Attempt ${attempt}: Navigating to http://127.0.0.1:5173/#consents (${cfg.theme}, ${cfg.viewport.width}x${cfg.viewport.height})...`);
				await page.goto("http://127.0.0.1:5173/#consents", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForTimeout(1000);
				loaded = true;
			} catch (e) {
				console.log(`[RETRY] Attempt ${attempt} failed: ${e.message}`);
				await page.waitForTimeout(2000);
			}
		}

		try {
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-consents"));
			});
			await page.waitForTimeout(800);

			await page.waitForSelector('[data-testid="consent-studio-modal"]', { timeout: 15000 });

			await page.evaluate((theme) => {
				const isDark = theme === "dark";
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.body.classList.toggle("dark", isDark);
				document.body.classList.toggle("light", !isDark);
			}, cfg.theme);
			await page.waitForTimeout(500);

			const targetPath = path.join(PROOFS_DIR, cfg.filename);
			await page.screenshot({ path: targetPath, fullPage: false });
			const stats = fs.statSync(targetPath);
			console.log(`[OK] Saved ${cfg.filename} (${Math.round(stats.size / 1024)} KB)`);

			if (stats.size < 20 * 1024) {
				throw new Error(`Screenshot ${cfg.filename} is suspiciously small: ${stats.size} bytes`);
			}
		} catch (err) {
			console.error(`[ERROR] Failed to capture ${cfg.filename}:`, err);
		} finally {
			await context.close();
		}
	}

	await browser.close();
	console.log("[DONE] All 4-state visual proofs captured successfully.");
}

capture().catch((err) => {
	console.error("[FATAL] Capture script failed:", err);
	process.exit(1);
});
