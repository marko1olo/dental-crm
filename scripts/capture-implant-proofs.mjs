import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/implants");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function capture() {
	const browser = await chromium.launch({ headless: true, channel: "chrome" });

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
		page.on("console", (msg) => console.log("BROWSER LOG:", msg.type(), msg.text()));
		page.on("pageerror", (err) => console.error("BROWSER ERROR:", err.message));
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
		await page.waitForTimeout(1000);

		const outPath = path.join(OUT_DIR, sc.name);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved: ${outPath}`);

		await context.close();
	}

	await browser.close();
	console.log("All 4 proofs captured successfully!");
}

capture().catch((err) => {
	console.error("Error capturing proofs:", err);
	process.exit(1);
});
