import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/implants");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function capture() {
	const browser = await chromium.launch({ headless: true, channel: "chrome" });

	try {
		const scenarios = [
			{ name: "pc-light.png", width: 1440, height: 900, isMobile: false, theme: "light" },
			{ name: "pc-dark.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
			{ name: "mobile-light.png", width: 390, height: 844, isMobile: true, theme: "light" },
			{ name: "mobile-dark.png", width: 390, height: 844, isMobile: true, theme: "dark" },
		];

		for (const sc of scenarios) {
			console.log(`Capturing ${sc.name}...`);
			const context = await browser.newContext({
				viewport: { width: sc.width, height: sc.height },
				isMobile: sc.isMobile,
				hasTouch: sc.isMobile,
				deviceScaleFactor: 2,
			});

			const page = await context.newPage();
			await page.goto("http://127.0.0.1:5173/?demo=true#implants", { waitUntil: "commit" });

			// Set theme
			await page.evaluate((theme) => {
				document.documentElement.setAttribute("data-theme", theme);
				document.body.setAttribute("data-theme", theme);
				if (theme === "dark") {
					document.documentElement.classList.add("dark");
					document.body.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
					document.body.classList.remove("dark");
				}
			}, sc.theme);

			await page.waitForSelector("[data-testid='implant-passport-modal']", { timeout: 20000 });
			await page.waitForTimeout(600);

			// 1. Capture Protocol Tab
			const outPath = path.join(OUT_DIR, sc.name);
			await page.screenshot({ path: outPath, fullPage: false });
			console.log(`Saved: ${outPath}`);

			// 2. Switch to Passport View & Capture
			const passportTab = page.locator("[data-testid='implant-tab-passport']");
			if (await passportTab.count() > 0) {
				await passportTab.click();
				await page.waitForTimeout(400);
				const cardName = sc.name.replace(".png", "_passport.png");
				const cardPath = path.join(OUT_DIR, cardName);
				await page.screenshot({ path: cardPath, fullPage: false });
				console.log(`Saved passport card: ${cardPath}`);
			}

			await context.close();
		}
		console.log("All 4 states captured successfully!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Error capturing proofs:", err);
	process.exit(1);
});
