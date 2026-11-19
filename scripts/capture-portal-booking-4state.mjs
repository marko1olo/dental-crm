import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WEB_BASE = "http://127.0.0.1:5173";
const PORTAL_PROOFS_DIR = path.resolve("docs/proofs/portal");
const BOOKING_PROOFS_DIR = path.resolve("docs/proofs/booking");
const BRAIN_PROOFS_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/7b93454d-a04b-4b1e-aa3b-f6a9fffdcfdb/proofs");

fs.mkdirSync(PORTAL_PROOFS_DIR, { recursive: true });
fs.mkdirSync(BOOKING_PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_PROOFS_DIR, { recursive: true });

async function saveProof(page, fileName, bookingFileName) {
	const p1 = path.join(PORTAL_PROOFS_DIR, fileName);
	await page.screenshot({ path: p1, fullPage: false });

	const pBooking = path.join(BOOKING_PROOFS_DIR, bookingFileName || fileName);
	fs.copyFileSync(p1, pBooking);

	const p2 = path.join(BRAIN_PROOFS_DIR, fileName);
	fs.copyFileSync(p1, p2);

	const stats = fs.statSync(p1);
	const content = fs.readFileSync(p1);
	const hash = crypto.createHash("md5").update(content).digest("hex");
	console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB, md5: ${hash})`);
	if (stats.size < 40960) {
		console.warn(`[WARN] Screenshot ${fileName} is below 40KB (${stats.size} bytes)`);
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
		console.log("\n--- PUBLIC BOOKING & SHOWCASE 4-STATE PROOFS ---");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();

		await page.addInitScript(() => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
			} catch (_) {}
		});

		console.log("Navigating to live public booking page with demo mode enabled...");
		await page.goto(`${WEB_BASE}/#/book?demo=true`, {
			waitUntil: "commit",
			timeout: 20000,
		});

		// Wait until booking UI renders
		console.log("Waiting for booking page content...");
		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText.trim() : "";
			return (
				text.includes("Онлайн-запись") ||
				text.includes("Личный кабинет") ||
				text.includes("Стоматологическая клиника DENTE")
			);
		}, { timeout: 30000 });

		await page.waitForTimeout(1000);

		// Ensure we are in "Онлайн-запись на приём" mode
		const bookingTab = await page.$('button:has-text("Онлайн-запись")');
		if (bookingTab) {
			await bookingTab.click();
			await page.waitForTimeout(600);
		}

		// 1. PC Light (1440x900)
		console.log("Capturing PC Light...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(800);
		await saveProof(page, "01_patient_portal_pc_light_1440x900.png", "01_public_booking_pc_light_1440x900.png");
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "01_patient_portal_pc_light_1440x900.png"), path.join(PORTAL_PROOFS_DIR, "01_booking_portal_pc_light_1440x900.png"));
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "01_patient_portal_pc_light_1440x900.png"), path.join(BOOKING_PROOFS_DIR, "01_booking_portal_pc_light_1440x900.png"));

		// 2. PC Dark (1440x900)
		console.log("Capturing PC Dark...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(800);
		await saveProof(page, "02_patient_portal_pc_dark_1440x900.png", "02_public_booking_pc_dark_1440x900.png");
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "02_patient_portal_pc_dark_1440x900.png"), path.join(PORTAL_PROOFS_DIR, "02_booking_portal_pc_dark_1440x900.png"));
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "02_patient_portal_pc_dark_1440x900.png"), path.join(BOOKING_PROOFS_DIR, "02_booking_portal_pc_dark_1440x900.png"));

		// 3. Mobile Light (390x844)
		console.log("Capturing Mobile Light...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(800);
		await saveProof(page, "03_patient_portal_mobile_light_390x844.png", "03_public_booking_mobile_light_390x844.png");
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "03_patient_portal_mobile_light_390x844.png"), path.join(PORTAL_PROOFS_DIR, "03_booking_portal_mobile_light_390x844.png"));
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "03_patient_portal_mobile_light_390x844.png"), path.join(BOOKING_PROOFS_DIR, "03_booking_portal_mobile_light_390x844.png"));

		// 4. Mobile Dark (390x844)
		console.log("Capturing Mobile Dark...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(800);
		await saveProof(page, "04_patient_portal_mobile_dark_390x844.png", "04_public_booking_mobile_dark_390x844.png");
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "04_patient_portal_mobile_dark_390x844.png"), path.join(PORTAL_PROOFS_DIR, "04_booking_portal_mobile_dark_390x844.png"));
		fs.copyFileSync(path.join(PORTAL_PROOFS_DIR, "04_patient_portal_mobile_dark_390x844.png"), path.join(BOOKING_PROOFS_DIR, "04_booking_portal_mobile_dark_390x844.png"));

		await context.close();
		console.log("\n>>> PUBLIC BOOKING 4-STATE PROOFS SUCCESSFULLY CAPTURED! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
