/**
 * scripts/capture_cbct_adaptive_inquisition.cjs
 *
 * Playwright script for capturing robust, high-resolution (1440x900) screenshots
 * of the DENTE CBCT Adaptive Visual Workbench in Light and Dark modes.
 *
 * Mandate 8b, Mandate 8e, Apple HIG, Zero Sycophancy.
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const targetDirs = [
	path.resolve(
		"C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_adaptive_inquisition",
	),
	path.resolve(
		"C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/cbct_adaptive_inquisition",
	),
];

for (const d of targetDirs) {
	if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function md5File(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash("md5").update(content).digest("hex");
}

async function takeScreen(page, fileName, description) {
	const p1 = path.join(targetDirs[0], fileName);
	if (fs.existsSync(p1)) {
		try {
			fs.unlinkSync(p1);
		} catch {}
	}
	await page.screenshot({ path: p1, fullPage: false });
	for (let i = 1; i < targetDirs.length; i++) {
		fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
	}
	const stat = fs.statSync(p1);
	const hash = md5File(p1);
	console.log(
		`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB | MD5: ${hash}`,
	);
	if (stat.size < 40 * 1024) {
		throw new Error(
			`Screenshot ${fileName} is too small (${stat.size} bytes < 40 KB)! Defect rejection.`,
		);
	}
	return { path: p1, size: stat.size, hash };
}

async function run() {
	console.log("==========================================================");
	console.log(">>> LAUNCHING CBCT ADAPTIVE INQUISITION CAPTURE ENGINE <<<");
	console.log("==========================================================");

	const browser = await chromium.launch({
		headless: true,
		executablePath:
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--enable-webgl",
			"--ignore-gpu-blocklist",
			"--use-gl=angle",
			"--use-angle=default",
		],
	});

	const capturedRecords = [];

	try {
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await ctx.newPage();
		page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
		});
		page.on("requestfailed", (req) => {
			console.log(
				"[REQ FAILED]:",
				req.url(),
				req.failure() ? req.failure().errorText : "",
			);
		});
		page.on("response", (res) => {
			if (res.status() >= 400) {
				console.log(`[HTTP ${res.status()}]:`, res.url());
			}
		});

		// ========================================================
		// 1. PC LIGHT (1440x900) — Quad Mode (4 Квадранта)
		// ========================================================
		console.log("\n[1/4] Navigating to CBCT Workbench in Light Mode...");
		await page.goto(
			"http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=light",
			{
				waitUntil: "networkidle",
				timeout: 30000,
			},
		);
		await page.waitForSelector('[data-testid="cbct-adaptive-workbench-root"]', {
			timeout: 15000,
		});
		await page.waitForTimeout(1500);

		const rec1 = await takeScreen(
			page,
			"01_cbct_adaptive_quad_light.png",
			"CBCT Adaptive Workbench: 4 Квадранта (PC Light 1440x900)",
		);
		capturedRecords.push(rec1);

		// ========================================================
		// 2. PC DARK (1440x900) — Quad Mode (4 Квадранта)
		// ========================================================
		console.log("\n[2/4] Switching to Dark Mode via header button...");
		const darkBtn = await page.waitForSelector(
			'[data-testid="btn-theme-dark"]',
			{ timeout: 5000 },
		);
		await darkBtn.click({ force: true });
		await page.waitForTimeout(1200);

		const rec2 = await takeScreen(
			page,
			"02_cbct_adaptive_quad_dark.png",
			"CBCT Adaptive Workbench: 4 Квадранта (PC Dark 1440x900)",
		);
		capturedRecords.push(rec2);

		// ========================================================
		// 3. PC DARK (1440x900) — 3D Skull Viewport Fullscreen Focus
		// ========================================================
		console.log("\n[3/4] Switching to 3D Skull Fullscreen Focus...");
		const layout3dBtn = await page.waitForSelector(
			'[data-testid="btn-layout-3d"]',
			{ timeout: 5000 },
		);
		await layout3dBtn.click({ force: true });
		await page.waitForTimeout(1000);

		// Click 3/4 Isometric orientation
		const isoBtn = await page.waitForSelector(
			'[data-testid="cbct-btn-orientation-isometric"]',
			{ timeout: 5000 },
		);
		await isoBtn.click({ force: true });
		await page.waitForTimeout(800);

		const rec3 = await takeScreen(
			page,
			"03_cbct_adaptive_3d_skull_dark.png",
			"CBCT Adaptive Workbench: 3D Череп WebGL2 Ракурс 3/4 (PC Dark 1440x900)",
		);
		capturedRecords.push(rec3);

		// ========================================================
		// 4. PC LIGHT (1440x900) — Torture Bar: Battery Saving + Hibernation
		// ========================================================
		console.log(
			"\n[4/4] Activating Torture Mode: Battery Saving + Sleep Mode + Light Theme...",
		);
		const lightBtn = await page.waitForSelector(
			'[data-testid="btn-theme-light"]',
			{ timeout: 5000 },
		);
		await lightBtn.click({ force: true });
		await page.waitForTimeout(500);

		// Switch back to Quad layout
		const quadBtn = await page.waitForSelector(
			'[data-testid="btn-layout-quad"]',
			{ timeout: 5000 },
		);
		await quadBtn.click({ force: true });
		await page.waitForTimeout(500);

		// Toggle Battery Simulation
		const batteryBtn = await page.waitForSelector(
			'[data-testid="workbench-btn-toggle-battery"]',
			{ timeout: 5000 },
		);
		await batteryBtn.click({ force: true });
		await page.waitForTimeout(500);

		// Toggle Sleep/Hibernation Simulation
		const sleepBtn = await page.waitForSelector(
			'[data-testid="workbench-btn-toggle-sleep"]',
			{ timeout: 5000 },
		);
		await sleepBtn.click({ force: true });
		await page.waitForTimeout(800);

		const rec4 = await takeScreen(
			page,
			"04_cbct_adaptive_torture_battery_sleep_light.png",
			"CBCT Adaptive Workbench: Стресс-режим Батарея ≤20% + 💤 Сон гибернация (PC Light 1440x900)",
		);
		capturedRecords.push(rec4);

		// ========================================================
		// Audit MD5 Uniqueness
		// ========================================================
		const hashes = new Set(capturedRecords.map((r) => r.hash));
		if (hashes.size !== capturedRecords.length) {
			throw new Error(
				"Duplicate screenshot MD5 hashes detected! Verification failed.",
			);
		}

		console.log("\n==========================================================");
		console.log(">>> ALL SCREENSHOTS SUCCESSFULLY CAPTURED & VALIDATED! <<<");
		console.log(
			`Total captured: ${capturedRecords.length} unique PNGs (all > 40 KB)`,
		);
		console.log("==========================================================");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL CAPTURE ERROR]:", err);
	process.exit(1);
});
