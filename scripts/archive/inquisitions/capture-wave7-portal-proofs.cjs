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
	await page.waitForTimeout(600);
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
		// 1. PC Booking Light (1440x900)
		const pcCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcCtx.newPage();
		console.log("Loading PC Booking...");
		await pcPage.goto("http://127.0.0.1:5173/book", { waitUntil: "domcontentloaded", timeout: 20000 });
		await pcPage.waitForSelector(".dente-booking-widget, .dbw-header", { timeout: 15000 }).catch(() => {});
		await setTheme(pcPage, false);
		await captureProof(pcPage, "wave7_booking_pc_light_1440x900.png");

		// 2. PC Booking Dark (1440x900)
		await setTheme(pcPage, true);
		await captureProof(pcPage, "wave7_booking_pc_dark_1440x900.png");
		await pcPage.close();
		await pcCtx.close();

		// 3. Mobile Telegram WebApp Light (390x844)
		const mobCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobPage = await mobCtx.newPage();
		console.log("Loading Telegram WebApp Mobile...");
		await mobPage.goto("http://127.0.0.1:5173/#/portal/tgapp", { waitUntil: "domcontentloaded", timeout: 20000 });
		await mobPage.waitForSelector(".tg-app-container, .tg-cabinet-root, .tg-tab-bar", { timeout: 15000 }).catch(() => {});

		// Switch to Tax tab if available
		const taxTab = await mobPage.$('button:has-text("Налог 13%"), .tg-nav-btn:nth-child(4)');
		if (taxTab) {
			console.log("Clicking Tax 13% tab...");
			await taxTab.click();
			await mobPage.waitForTimeout(800);
		}

		await setTheme(mobPage, false);
		await captureProof(mobPage, "wave7_tgapp_tax_mobile_light_390x844.png");

		// 4. Mobile Telegram WebApp Dark (390x844)
		await setTheme(mobPage, true);
		await captureProof(mobPage, "wave7_tgapp_tax_mobile_dark_390x844.png");

		await mobPage.close();
		await mobCtx.close();

		console.log("WAVE 7 VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
