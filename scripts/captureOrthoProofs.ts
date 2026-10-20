import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
	const outputDir = path.resolve(process.cwd(), "docs", "proofs", "orthodontics");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	console.log("Launching browser for Orthodontics 4-State Proofs...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch (e) {
		console.warn("msedge not available, launching default chromium:", e);
		browser = await chromium.launch({ headless: true });
	}

	const BASE_URL = "http://127.0.0.1:5173/?demo=true";

	async function preparePage(page: any, isMobile: boolean) {
		await page.waitForTimeout(1500);

		// Click "Ортодонт" role if available
		try {
			const orthoRoleBtn = await page.$('button:has-text("Ортодонт")');
			if (orthoRoleBtn) {
				console.log("Clicking Orthodontist role...");
				await orthoRoleBtn.click();
				await page.waitForTimeout(1000);
			}
		} catch (e) {
			console.warn("Role switch note:", e);
		}

		// Ensure perspective is orthodontic and hash is #visit
		await page.evaluate(() => {
			localStorage.setItem("dente_workspace_perspective", "orthodontic");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
			if (window.location.hash !== "#visit") {
				window.location.hash = "#visit";
			}
		});
		await page.waitForTimeout(800);

		// Open widget if not open
		const widgetSelector = '[data-testid="orthodontic-visit-protocol-widget"]';
		let widget = await page.$(widgetSelector);
		if (!widget) {
			const openBtn = await page.$('[data-testid="btn-open-ortho-protocol-widget"]');
			if (openBtn) {
				console.log("Opening Ortho Protocol Widget...");
				await openBtn.click();
				await page.waitForTimeout(1000);
			}
		}

		// If on mobile, ensure we see the bottom sheet drag handle and controls
		if (isMobile) {
			await page.waitForSelector('[data-testid="orthodontic-visit-protocol-widget"]', { timeout: 3000 }).catch(() => {});
		}
	}

	// 1. PC Light (1440x900)
	{
		console.log("Capturing 1/4: PC Light (1440x900)...");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		await context.addInitScript(() => {
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_workspace_perspective", "orthodontic");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
		});

		const page = await context.newPage();
		await page.goto(`${BASE_URL}#visit`, { waitUntil: "domcontentloaded" });
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});

		await preparePage(page, false);

		const outPath = path.join(outputDir, "pc_light_1440x900.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);
		await context.close();
	}

	// 2. PC Dark (1440x900)
	{
		console.log("Capturing 2/4: PC Dark (1440x900)...");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "dark",
		});
		await context.addInitScript(() => {
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_workspace_perspective", "orthodontic");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
		});

		const page = await context.newPage();
		await page.goto(`${BASE_URL}#visit`, { waitUntil: "domcontentloaded" });
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});

		await preparePage(page, false);

		const outPath = path.join(outputDir, "pc_dark_1440x900.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);
		await context.close();
	}

	// 3. Mobile Light (390x844)
	{
		console.log("Capturing 3/4: Mobile Light (390x844)...");
		const context = await browser.newContext({
			...devices["iPhone 13"],
			colorScheme: "light",
		});
		await context.addInitScript(() => {
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_workspace_perspective", "orthodontic");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
		});

		const page = await context.newPage();
		await page.goto(`${BASE_URL}#visit`, { waitUntil: "domcontentloaded" });
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});

		await preparePage(page, true);

		const outPath = path.join(outputDir, "mobile_light_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);
		await context.close();
	}

	// 4. Mobile Dark (390x844)
	{
		console.log("Capturing 4/4: Mobile Dark (390x844)...");
		const context = await browser.newContext({
			...devices["iPhone 13"],
			colorScheme: "dark",
		});
		await context.addInitScript(() => {
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_workspace_perspective", "orthodontic");
			localStorage.setItem("dente_offline_autonomy_mode", "true");
		});

		const page = await context.newPage();
		await page.goto(`${BASE_URL}#visit`, { waitUntil: "domcontentloaded" });
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});

		await preparePage(page, true);

		const outPath = path.join(outputDir, "mobile_dark_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);
		await context.close();
	}

	await browser.close();
	console.log("All 4 orthodontic screenshots captured successfully!");
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
