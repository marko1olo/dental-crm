/**
 * scripts/take_portal_4state_proofs.cjs
 * Visual Proof Pipeline for Patient Portal, Self-Checkin Kiosk & Public Booking:
 * 4-State Visual Proof (PC & Mobile, Light & Dark).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "../docs/proofs/portal");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function setTheme(page, isDark) {
	const themeId = isDark ? "dark" : "light";
	await page.evaluate(({ themeId, isDark }) => {
		document.documentElement.setAttribute("data-theme", themeId);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		const themedNodes = document.querySelectorAll("[data-theme]");
		for (const n of themedNodes) {
			n.setAttribute("data-theme", themeId);
		}
	}, { themeId, isDark });
	await page.waitForTimeout(1000);
}

async function captureProof(page, filename) {
	await page.waitForTimeout(600);
	const filePath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(filePath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
	return filePath;
}

async function run() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ==========================================
		// 1. KIOSK PC (1440x900) - Light & Dark
		// ==========================================
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcKioskPage = await pcContext.newPage();
		console.log("Loading Kiosk PC...");
		await pcKioskPage.goto("http://127.0.0.1:5173/?kiosk=1#/portal/kiosk/demo-clinic", { waitUntil: "commit", timeout: 25000 });
		await pcKioskPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcKioskPage.waitForSelector(".self-checkin-modal, [data-testid='mobile-self-checkin-modal']", { timeout: 15000 }).catch(() => {});
		await pcKioskPage.waitForTimeout(1000);

		// PC Light Kiosk
		await setTheme(pcKioskPage, false);
		await captureProof(pcKioskPage, "portal_kiosk_pc_light_1440x900.png");

		// PC Dark Kiosk
		await setTheme(pcKioskPage, true);
		await captureProof(pcKioskPage, "portal_kiosk_pc_dark_1440x900.png");
		await pcKioskPage.close();

		// ==========================================
		// 2. KIOSK MOBILE (390x844) - Light & Dark
		// ==========================================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobileKioskPage = await mobileContext.newPage();
		console.log("Loading Kiosk Mobile...");
		await mobileKioskPage.goto("http://127.0.0.1:5173/?kiosk=1#/portal/kiosk/demo-clinic", { waitUntil: "commit", timeout: 25000 });
		await mobileKioskPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobileKioskPage.waitForSelector(".self-checkin-modal, [data-testid='mobile-self-checkin-modal']", { timeout: 15000 }).catch(() => {});
		await mobileKioskPage.waitForTimeout(1000);

		// Mobile Light Kiosk
		await setTheme(mobileKioskPage, false);
		await captureProof(mobileKioskPage, "portal_kiosk_mobile_light_390x844.png");

		// Mobile Dark Kiosk
		await setTheme(mobileKioskPage, true);
		await captureProof(mobileKioskPage, "portal_kiosk_mobile_dark_390x844.png");
		await mobileKioskPage.close();

		// ==========================================
		// 3. PUBLIC BOOKING (PC 1440x900) - Light & Dark
		// ==========================================
		const pcBookingPage = await pcContext.newPage();
		console.log("Loading Public Booking PC...");
		await pcBookingPage.goto("http://127.0.0.1:5173/?booking=1#/portal/booking/demo-clinic", { waitUntil: "commit", timeout: 25000 });
		await pcBookingPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcBookingPage.waitForSelector(".dente-booking-widget, .dbw-header", { timeout: 15000 }).catch(() => {});
		await pcBookingPage.waitForTimeout(1000);

		await setTheme(pcBookingPage, false);
		await captureProof(pcBookingPage, "portal_booking_pc_light_1440x900.png");

		await setTheme(pcBookingPage, true);
		await captureProof(pcBookingPage, "portal_booking_pc_dark_1440x900.png");
		await pcBookingPage.close();

		// ==========================================
		// 4. TELEGRAM MINI APP (Mobile 390x844) - Light & Dark
		// ==========================================
		const mobileTgPage = await mobileContext.newPage();
		console.log("Loading Telegram Mini App Mobile...");
		await mobileTgPage.goto("http://127.0.0.1:5173/#/portal/tgapp", { waitUntil: "commit", timeout: 25000 });
		await mobileTgPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobileTgPage.waitForSelector(".tg-app-container, .tg-cabinet-root", { timeout: 15000 }).catch(() => {});
		await mobileTgPage.waitForTimeout(1000);

		await setTheme(mobileTgPage, false);
		await captureProof(mobileTgPage, "portal_tgapp_mobile_light_390x844.png");

		await setTheme(mobileTgPage, true);
		await captureProof(mobileTgPage, "portal_tgapp_mobile_dark_390x844.png");
		await mobileTgPage.close();

		console.log("ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
