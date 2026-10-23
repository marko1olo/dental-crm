import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const BOOKING_PROOFS_DIR = path.resolve("docs/proofs/booking");
const PORTAL_PROOFS_DIR = path.resolve("docs/proofs/portal");
const BRAIN_PROOFS_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/92917ac6-e5f9-433b-860b-96e66ce837ec/proofs");

fs.mkdirSync(BOOKING_PROOFS_DIR, { recursive: true });
fs.mkdirSync(PORTAL_PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_PROOFS_DIR, { recursive: true });

async function saveProof(page, targetDir, fileName) {
	const p1 = path.join(targetDir, fileName);
	await page.screenshot({ path: p1, fullPage: false });
	const p2 = path.join(BRAIN_PROOFS_DIR, fileName);
	fs.copyFileSync(p1, p2);

	const stats = fs.statSync(p1);
	console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
	if (stats.size < 20480) {
		throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
	}
	return p1;
}

async function main() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	console.log("Using browser executable:", browserPath);
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ==========================================
		// 1. PUBLIC ONLINE BOOKING 4-STATE PROOFS
		// ==========================================
		console.log("\n--- 1. PUBLIC ONLINE BOOKING 4-STATE PROOFS ---");
		const bookingContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const bookingPage = await bookingContext.newPage();

		console.log("Navigating to live public booking page...");
		await bookingPage.goto(`${WEB_BASE}/#/book`, {
			waitUntil: "commit",
			timeout: 20000,
		});

		await bookingPage.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...");
		}, { timeout: 30000 }).catch(() => {});

		await bookingPage.waitForSelector(".dente-booking-widget", { state: "visible", timeout: 15000 });
		await bookingPage.waitForTimeout(1000);

		// 1.1 PC Light (1440x900)
		console.log("Capturing 01_booking_pc_light.png...");
		await bookingPage.setViewportSize({ width: 1440, height: 900 });
		await bookingPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await bookingPage.waitForTimeout(600);
		await saveProof(bookingPage, BOOKING_PROOFS_DIR, "01_booking_pc_light.png");

		// 1.2 PC Dark (1440x900)
		console.log("Capturing 02_booking_pc_dark.png...");
		await bookingPage.setViewportSize({ width: 1440, height: 900 });
		await bookingPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await bookingPage.waitForTimeout(600);
		await saveProof(bookingPage, BOOKING_PROOFS_DIR, "02_booking_pc_dark.png");

		// 1.3 Mobile Light (390x844)
		console.log("Capturing 03_booking_mobile_light.png...");
		await bookingPage.setViewportSize({ width: 390, height: 844 });
		await bookingPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await bookingPage.waitForTimeout(600);
		await saveProof(bookingPage, BOOKING_PROOFS_DIR, "03_booking_mobile_light.png");

		// 1.4 Mobile Dark (390x844)
		console.log("Capturing 04_booking_mobile_dark.png...");
		await bookingPage.setViewportSize({ width: 390, height: 844 });
		await bookingPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await bookingPage.waitForTimeout(600);
		await saveProof(bookingPage, BOOKING_PROOFS_DIR, "04_booking_mobile_dark.png");

		await bookingContext.close();

		// ==========================================
		// 2. KIOSK SELF CHECK-IN 4-STATE PROOFS
		// ==========================================
		console.log("\n--- 2. KIOSK SELF CHECK-IN 4-STATE PROOFS ---");
		const kioskContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const kioskPage = await kioskContext.newPage();

		console.log("Navigating to live kiosk self check-in page...");
		await kioskPage.goto(`${WEB_BASE}/#/portal/kiosk`, {
			waitUntil: "commit",
			timeout: 20000,
		});

		await kioskPage.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...");
		}, { timeout: 30000 }).catch(() => {});

		await kioskPage.waitForSelector(".selfcheckin-modal-window", { state: "visible", timeout: 15000 });
		await kioskPage.waitForTimeout(1000);

		// 2.1 PC Light (1440x900)
		console.log("Capturing 05_kiosk_pc_light.png...");
		await kioskPage.setViewportSize({ width: 1440, height: 900 });
		await kioskPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await kioskPage.waitForTimeout(600);
		await saveProof(kioskPage, PORTAL_PROOFS_DIR, "05_kiosk_pc_light.png");

		// 2.2 PC Dark (1440x900)
		console.log("Capturing 06_kiosk_pc_dark.png...");
		await kioskPage.setViewportSize({ width: 1440, height: 900 });
		await kioskPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await kioskPage.waitForTimeout(600);
		await saveProof(kioskPage, PORTAL_PROOFS_DIR, "06_kiosk_pc_dark.png");

		// 2.3 Mobile Light (390x844)
		console.log("Capturing 07_kiosk_mobile_light.png...");
		await kioskPage.setViewportSize({ width: 390, height: 844 });
		await kioskPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await kioskPage.waitForTimeout(600);
		await saveProof(kioskPage, PORTAL_PROOFS_DIR, "07_kiosk_mobile_light.png");

		// 2.4 Mobile Dark (390x844)
		console.log("Capturing 08_kiosk_mobile_dark.png...");
		await kioskPage.setViewportSize({ width: 390, height: 844 });
		await kioskPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await kioskPage.waitForTimeout(600);
		await saveProof(kioskPage, PORTAL_PROOFS_DIR, "08_kiosk_mobile_dark.png");

		await kioskContext.close();

		console.log("\n>>> ALL 8 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
