const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR_PORTAL = path.resolve(__dirname, "../docs/proofs/portal");
const OUT_DIR_BOOKING = path.resolve(__dirname, "../docs/proofs/booking");

fs.mkdirSync(OUT_DIR_PORTAL, { recursive: true });
fs.mkdirSync(OUT_DIR_BOOKING, { recursive: true });

async function captureState(browser, isMobile, isDark, filename) {
	const viewport = isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
	const theme = isDark ? "dark" : "light";
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: isMobile ? 2 : 1,
		isMobile,
		hasTouch: isMobile,
	});
	const page = await context.newPage();

	console.log(`Navigating for ${filename}...`);
	await page.goto("http://127.0.0.1:5173/#/portal/booking/01a00000-0000-0000-0000-000000000000", {
		waitUntil: "commit",
	});

	console.log(`Waiting 9s for React hydration (${filename})...`);
	await page.waitForTimeout(9000);

	await page.evaluate(({ theme, isDark }) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.setAttribute("data-theme", theme);
		try {
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dental_theme", theme);
		} catch (_) {}
	}, { theme, isDark });

	await page.waitForTimeout(1000);

	const pPortal = path.join(OUT_DIR_PORTAL, filename);
	await page.screenshot({ path: pPortal, animations: "disabled" });

	const pBooking = path.join(OUT_DIR_BOOKING, filename);
	fs.copyFileSync(pPortal, pBooking);

	const size = fs.statSync(pPortal).size;
	console.log(`[CAPTURED] ${filename} -> ${size} bytes`);

	await page.close();
	await context.close();
}

async function run() {
	console.log("=== STARTING FLAWLESS 4-STATE CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light
		await captureState(browser, false, false, "01_booking_portal_pc_light_1440x900.png");

		// 2. PC Dark
		await captureState(browser, false, true, "02_booking_portal_pc_dark_1440x900.png");

		// 3. Mobile Light
		await captureState(browser, true, false, "03_booking_portal_mobile_light_390x844.png");

		// 4. Mobile Dark
		await captureState(browser, true, true, "04_booking_portal_mobile_dark_390x844.png");

		console.log("🎉 ALL 4 CANONICAL PROOFS SUCCESSFULLY CAPTURED!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("FATAL ERROR:", e);
	process.exit(1);
});
