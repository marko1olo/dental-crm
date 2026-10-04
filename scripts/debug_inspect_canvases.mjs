import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-web-security",
			"--ignore-gpu-blocklist",
			"--use-gl=angle",
			"--enable-webgl",
		],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_demo_showcase", "true");
	});

	await page.goto("http://127.0.0.1:5173/#imaging");
	await page.waitForTimeout(2000);

	// Navigate to imaging hash
	await page.evaluate(() => { window.location.hash = "#imaging"; });
	const nav = page.locator("a[href='#imaging'], [data-tour='imaging-nav']").first();
	if (await nav.isVisible()) await nav.click({ force: true });
	await page.waitForTimeout(2000);

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
	await openMprBtn.click({ force: true });
	await page.waitForTimeout(2000);

	// Load demo volume
	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	if (await loadDemoBtn.isVisible()) {
		await loadDemoBtn.click({ force: true });
		await page.waitForTimeout(4000);
	}

	// Wait for 3D Volume
	const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
	if (await mode3dBtn.isVisible()) {
		await mode3dBtn.click({ force: true });
		await page.waitForTimeout(2000);
	}

	const expand3dBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
	if (await expand3dBtn.isVisible()) {
		await expand3dBtn.click({ force: true });
		await page.waitForTimeout(3000);
	}

	// Capture WebGL canvas alone and Overlay canvas alone
	const canvases = await page.evaluate(() => {
		const glCanvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		const ovCanvas = document.querySelector("[data-testid='cbct-volume-3d-overlay-canvas']");
		return {
			glData: glCanvas ? glCanvas.toDataURL() : null,
			ovData: ovCanvas ? ovCanvas.toDataURL() : null,
		};
	});

	if (canvases.glData) {
		fs.writeFileSync("docs/screenshots/cbct_departments/debug_gl_canvas.png", canvases.glData.replace(/^data:image\/png;base64,/, ""), "base64");
		console.log("Saved debug_gl_canvas.png");
	}
	if (canvases.ovData) {
		fs.writeFileSync("docs/screenshots/cbct_departments/debug_ov_canvas.png", canvases.ovData.replace(/^data:image\/png;base64,/, ""), "base64");
		console.log("Saved debug_ov_canvas.png");
	}

	await browser.close();
}

main().catch(console.error);
