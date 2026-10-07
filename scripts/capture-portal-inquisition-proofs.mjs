/**
 * capture-portal-inquisition-proofs.mjs
 * 
 * Red Team Inquisitor Visual Proof Engine for Telegram Mini App & Patient Portal
 * 
 * Captures 390x844 Mobile-First proofs (Apple HIG compliant) in Mobile Light & Dark:
 * 1. 01_telegram_miniapp_booking_light.png: Booking screen with live doctor, date strip, time slots, floating CTA.
 * 2. 02_telegram_miniapp_booking_dark.png: Booking screen in dark theme.
 * 3. 03_telegram_tooth_picker_light.png: Interactive FDI tooth picker (quadrants, >=44x44px touch targets).
 * 4. 04_telegram_tooth_picker_dark.png: Interactive tooth picker in dark theme.
 * 5. 05_telegram_tooth_picker_bottom_sheet_light.png: Native Bottom Sheet drawer for tooth complaint.
 * 6. 06_telegram_tooth_picker_bottom_sheet_dark.png: Native Bottom Sheet drawer in dark theme.
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const ORG_ID = "c752bbc3-e8e3-4e4b-a008-8b8444ef097d";

const OUT_DIR = path.join(process.cwd(), "docs/screenshots/portal_inquisition");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
	return chromium.launch(launchOptions);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log(`[INQUISITION] Starting visual proof capture for Telegram Mini App...`);
	const browser = await getBrowser();
	const hashes = new Map();

	try {
		// Context: iPhone 14/15 dimensions (390 x 844, DPR 2)
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const page = await context.newPage();

		// Helper to set theme
		const setTheme = async (theme) => {
			await page.evaluate((t) => {
				document.documentElement.setAttribute("data-theme", t);
				document.documentElement.classList.toggle("dark", t === "dark");
				document.documentElement.classList.toggle("light", t === "light");
			}, theme);
			await wait(400);
		};

		// 1. TELEGRAM MINI APP BOOKING - LIGHT & DARK
		console.log(`[CAPTURE] Navigating to Telegram Mini App Booking...`);
		await page.goto(`${APP_BASE}/tgapp?org=${ORG_ID}&tab=booking`, { waitUntil: "networkidle" });
		await page.waitForSelector(".tg-booking-container", { timeout: 10000 });
		await wait(800);

		// Light Booking
		await setTheme("light");
		const bookingLightPath = path.join(OUT_DIR, "01_telegram_miniapp_booking_light.png");
		await page.screenshot({ path: bookingLightPath, fullPage: false });
		console.log(`[PROOF 1] Captured: ${bookingLightPath}`);

		// Dark Booking
		await setTheme("dark");
		const bookingDarkPath = path.join(OUT_DIR, "02_telegram_miniapp_booking_dark.png");
		await page.screenshot({ path: bookingDarkPath, fullPage: false });
		console.log(`[PROOF 2] Captured: ${bookingDarkPath}`);

		// 2. TELEGRAM INTERACTIVE TOOTH PICKER - LIGHT & DARK
		console.log(`[CAPTURE] Navigating to Telegram Tooth Picker...`);
		await page.goto(`${APP_BASE}/tgapp?org=${ORG_ID}&tab=odontogram`, { waitUntil: "networkidle" });
		await page.waitForSelector(".tg-tooth-picker-container", { timeout: 10000 });
		await wait(800);

		// Light Tooth Picker
		await setTheme("light");
		const toothLightPath = path.join(OUT_DIR, "03_telegram_tooth_picker_light.png");
		await page.screenshot({ path: toothLightPath, fullPage: false });
		console.log(`[PROOF 3] Captured: ${toothLightPath}`);

		// Dark Tooth Picker
		await setTheme("dark");
		const toothDarkPath = path.join(OUT_DIR, "04_telegram_tooth_picker_dark.png");
		await page.screenshot({ path: toothDarkPath, fullPage: false });
		console.log(`[PROOF 4] Captured: ${toothDarkPath}`);

		// 3. TOOTH PICKER BOTTOM SHEET DRAWER - LIGHT & DARK
		console.log(`[CAPTURE] Opening Bottom Sheet for Tooth #16...`);
		// Click on tooth #16
		const tooth16Btn = await page.locator("button.tg-tooth-cell:has-text('16')").first();
		if (await tooth16Btn.count() > 0) {
			await tooth16Btn.click();
		} else {
			// Click the first tooth cell
			await page.locator(".tg-tooth-cell").first().click();
		}
		await page.waitForSelector(".tg-bottom-sheet", { timeout: 5000 });
		await wait(500);

		// Light Bottom Sheet
		await setTheme("light");
		const sheetLightPath = path.join(OUT_DIR, "05_telegram_tooth_picker_bottom_sheet_light.png");
		await page.screenshot({ path: sheetLightPath, fullPage: false });
		console.log(`[PROOF 5] Captured: ${sheetLightPath}`);

		// Dark Bottom Sheet
		await setTheme("dark");
		const sheetDarkPath = path.join(OUT_DIR, "06_telegram_tooth_picker_bottom_sheet_dark.png");
		await page.screenshot({ path: sheetDarkPath, fullPage: false });
		console.log(`[PROOF 6] Captured: ${sheetDarkPath}`);

		// 4. SCROLLED BOOKING WITH FLOATING BOTTOM BAR CTA
		console.log(`[CAPTURE] Navigating back to booking for scrolled CTA proofs...`);
		await page.goto(`${APP_BASE}/tgapp?org=${ORG_ID}&tab=booking`, { waitUntil: "networkidle" });
		await page.waitForSelector(".tg-booking-container", { timeout: 10000 });
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await wait(500);

		// Scrolled Light
		await setTheme("light");
		const scrolledLightPath = path.join(OUT_DIR, "07_telegram_miniapp_booking_scrolled_cta_light.png");
		await page.screenshot({ path: scrolledLightPath, fullPage: false });
		console.log(`[PROOF 7] Captured: ${scrolledLightPath}`);

		// Scrolled Dark
		await setTheme("dark");
		const scrolledDarkPath = path.join(OUT_DIR, "08_telegram_miniapp_booking_scrolled_cta_dark.png");
		await page.screenshot({ path: scrolledDarkPath, fullPage: false });
		console.log(`[PROOF 8] Captured: ${scrolledDarkPath}`);

		// Audit MD5 and sizes
		const files = [
			bookingLightPath,
			bookingDarkPath,
			toothLightPath,
			toothDarkPath,
			sheetLightPath,
			sheetDarkPath,
			scrolledLightPath,
			scrolledDarkPath,
		];

		console.log(`\n--- INTEGRITY & QUALITY AUDIT ---`);
		for (const f of files) {
			const buf = readFileSync(f);
			const hash = crypto.createHash("md5").update(buf).digest("hex");
			const sizeKb = (buf.length / 1024).toFixed(1);
			console.log(`File: ${path.basename(f)} | Size: ${sizeKb} KB | MD5: ${hash}`);
			if (hashes.has(hash)) {
				throw new Error(`CRITICAL DEFECT: Duplicate screenshot detected! MD5 collision: ${hash}`);
			}
			if (buf.length < 30 * 1024) {
				throw new Error(`CRITICAL DEFECT: Suspiciously small screenshot (${sizeKb} KB) for ${f}`);
			}
			hashes.set(hash, f);
		}
		console.log(`[AUDIT SUCCESS] All 8 screenshots are unique and non-empty (>= 30 KB).`);

		await context.close();
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[INQUISITION ERROR]", err);
	process.exit(1);
});
