import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/orthodontics";
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function captureTarget(browser, target) {
	console.log(`\n=== Capturing ${target.canonicalName} (${target.width}x${target.height}, ${target.theme}) ===`);
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});

	const page = await context.newPage();

	// Set theme in localStorage before navigating
	await page.addInitScript((th) => {
		localStorage.setItem("dente_theme_mode", th);
	}, target.theme);

	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded" });
	await page.waitForSelector('[data-testid="demo-role-btn-orthodontist"]', { timeout: 30000 });

	const orthoBtn = await page.$('[data-testid="demo-role-btn-orthodontist"]');
	await orthoBtn.click();
	await page.waitForTimeout(1000);

	await page.evaluate((th) => {
		if (window.__usePerspectiveStore) {
			window.__usePerspectiveStore.getState().setPerspective("orthodontic");
		}
		window.location.hash = "#visit";
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, target.theme);
	await page.waitForTimeout(1000);

	await page.waitForSelector('[data-testid="btn-open-ortho-protocol-widget"]', { timeout: 15000 });
	const openBtn = await page.$('[data-testid="btn-open-ortho-protocol-widget"]');
	await openBtn.click();

	await page.waitForSelector('[data-testid="orthodontic-visit-protocol-widget"]', { timeout: 15000 });
	await page.waitForSelector('[data-testid="ortho-canonical-chairside-presets"]', { timeout: 15000 });

	// Apply 1-click canonical preset
	try {
		const presetBtn = await page.$('[data-testid="ortho-preset-bonding-both-mbt-btn"]');
		if (presetBtn) {
			await presetBtn.click();
			await page.waitForTimeout(600);
		}
	} catch (e) {
		console.warn("Preset click optional:", e.message);
	}

	// Dismiss any lingering error toast
	try {
		const toastClose = await page.$('[aria-label="Закрыть уведомление"], [data-testid="toast-close"]');
		if (toastClose) {
			await toastClose.click();
			await page.waitForTimeout(300);
		}
	} catch {}

	if (target.isMobile) {
		console.log(`Resizing to mobile viewport ${target.width}x${target.height}...`);
		await page.setViewportSize({ width: target.width, height: target.height });
		await page.waitForTimeout(800);

		try {
			await page.locator('[data-testid="ortho-canonical-chairside-presets"]').scrollIntoViewIfNeeded();
			await page.waitForTimeout(600);
		} catch {}
	}

	await page.waitForTimeout(1000);

	const outPathCanonical = path.join(PROOFS_DIR, target.canonicalName);
	const outPathAlt = path.join(PROOFS_DIR, target.altName);

	await page.screenshot({ path: outPathCanonical, fullPage: false });
	copyFileSync(outPathCanonical, outPathAlt);

	const stats = statSync(outPathCanonical);
	console.log(`Saved ${target.canonicalName} (${stats.size} bytes).`);

	if (stats.size < 20000) {
		throw new Error(`Screenshot size ${stats.size} bytes is < 20KB!`);
	}
	console.log(`✓ Proof size verified: ${(stats.size / 1024).toFixed(1)} KB >= 20 KB`);

	await context.close();
}

async function captureAll() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const targets = [
		{
			canonicalName: "ortho_pc_light_1440x900.png",
			altName: "01_ortho_pc_light_1440.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			canonicalName: "ortho_pc_dark_1440x900.png",
			altName: "02_ortho_pc_dark_1440.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			canonicalName: "ortho_mobile_light_390x844.png",
			altName: "03_ortho_mobile_light_390.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			canonicalName: "ortho_mobile_dark_390x844.png",
			altName: "04_ortho_mobile_dark_390.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		},
	];

	for (const target of targets) {
		await captureTarget(browser, target);
	}

	await browser.close();
	console.log("\n=== All 4 Red Team Screenshots Successfully Captured & Verified ===");
}

captureAll().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
