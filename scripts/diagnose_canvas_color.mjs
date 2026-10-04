import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
	page.on("pageerror", (err) => console.error(`[PAGE ERROR]`, err.message));

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2000);

	await page.evaluate(() => {
		document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
	await openMprBtn.click({ force: true });

	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	await loadDemoBtn.waitFor({ state: "visible", timeout: 15000 });
	await loadDemoBtn.click({ force: true });

	await page.locator("[data-testid='cbct-empty-volume-dropzone']").waitFor({ state: "hidden", timeout: 45000 });
	console.log("Volume mounted!");
	await page.waitForTimeout(3000);

	// Diagnose the 3D canvas
	const info = await page.evaluate(() => {
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		if (!canvas) return { error: "No canvas found!" };

		const comp = window.getComputedStyle(canvas);
		const parent = canvas.parentElement;
		const parentComp = parent ? window.getComputedStyle(parent) : null;

		// Check what context exists
		let hasGl = false;
		let has2D = false;
		try {
			const gl = canvas.getContext("webgl2");
			if (gl) hasGl = true;
		} catch (e) {}
		try {
			const ctx = canvas.getContext("2d");
			if (ctx) has2D = true;
		} catch (e) {}

		return {
			width: canvas.width,
			height: canvas.height,
			clientWidth: canvas.clientWidth,
			clientHeight: canvas.clientHeight,
			bgColor: comp.backgroundColor,
			parentBgColor: parentComp ? parentComp.backgroundColor : null,
			hasGl,
			has2D,
		};
	});

	console.log("Canvas Diagnosis:", JSON.stringify(info, null, 2));

	await browser.close();
}

main().catch(console.error);
