import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
	const outputDir = path.resolve(process.cwd(), "docs", "proofs", "orthodontics");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	console.log("Launching browser for Orthodontic Before/After Photo Protocol Proof...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch (e) {
		browser = await chromium.launch({ headless: true });
	}

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
	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded" });
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	});
	await page.waitForTimeout(1500);

	// Click "Ортодонт" role
	const orthoRoleBtn = await page.$('button:has-text("Ортодонт")');
	if (orthoRoleBtn) {
		await orthoRoleBtn.click();
		await page.waitForTimeout(800);
	}

	// Open photo protocol modal
	const photoBtn = await page.$('[data-testid="btn-open-ortho-photo-modal"]');
	if (photoBtn) {
		console.log("Opening Orthodontic Photo Protocol Modal...");
		await photoBtn.click();
		await page.waitForTimeout(800);
	}

	// Click compare button
	const compareBtn = await page.$('[data-testid="toggle-compare-before-after-btn"]');
	if (compareBtn) {
		console.log("Activating Before/After Compare View...");
		await compareBtn.click();
		await page.waitForTimeout(800);
	}

	const outPath = path.join(outputDir, "ortho_before_after_comparison.png");
	await page.screenshot({ path: outPath, fullPage: false });
	console.log(`Saved: ${outPath} (${fs.statSync(outPath).size} bytes)`);

	await browser.close();
}

run().catch((err) => {
	console.error("Failed:", err);
	process.exit(1);
});
