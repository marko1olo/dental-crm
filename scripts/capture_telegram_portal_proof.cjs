const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
	const outDir = path.resolve(__dirname, "../artifacts/telegram_portal");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});


	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram/10.9.1",
	});

	const page = await context.newPage();

	page.on("pageerror", (err) => console.error("PAGE_ERROR:", err.message, err.stack));
	page.on("console", (msg) => {
		if (msg.type() === "error") console.error("BROWSER_ERROR:", msg.text());
	});

	// 1. Открываем Telegram Mini App - Экран кабинета с записями (Светлая тема)
	console.log("Navigating to Telegram Mini App cabinet...");
	await page.goto("http://127.0.0.1:5173/#/portal/tgapp?tab=appointments", {
		waitUntil: "networkidle",
		timeout: 30000,
	});


	await page.waitForTimeout(1000);

	// Переключаем в светлую тему
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await page.waitForTimeout(500);

	const lightCabinetShot = path.join(outDir, "mobile_light_cabinet_records.png");
	await page.screenshot({ path: lightCabinetShot, fullPage: false });
	console.log(`Saved: ${lightCabinetShot}`);

	// 2. Экран кабинета со снимками (Светлая тема переключаем на таб снимков)
	console.log("Switching to imaging tab in light theme...");
	const imagingBtn = page.locator('.tg-nav-btn:has-text("Снимки")');
	if (await imagingBtn.count() > 0) {
		await imagingBtn.click();
		await page.waitForTimeout(500);
	}
	const lightImagingShot = path.join(outDir, "mobile_light_cabinet_imaging.png");
	await page.screenshot({ path: lightImagingShot, fullPage: false });
	console.log(`Saved: ${lightImagingShot}`);

	// 3. Экран кабинета со снимками в тёмной теме (Dark Mode)
	console.log("Switching to dark mode for imaging...");
	await page.evaluate(() => {
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await page.waitForTimeout(500);

	const darkImagingShot = path.join(outDir, "mobile_dark_cabinet_imaging.png");
	await page.screenshot({ path: darkImagingShot, fullPage: false });
	console.log(`Saved: ${darkImagingShot}`);

	// 4. Экран кабинета с записями в тёмной теме
	console.log("Switching to appointments tab in dark theme...");
	const appointmentsBtn = page.locator('.tg-nav-btn:has-text("Записи")');
	if (await appointmentsBtn.count() > 0) {
		await appointmentsBtn.click();
		await page.waitForTimeout(500);
	}
	const darkCabinetShot = path.join(outDir, "mobile_dark_cabinet_records.png");
	await page.screenshot({ path: darkCabinetShot, fullPage: false });
	console.log(`Saved: ${darkCabinetShot}`);

	// 5. Шторка справки для налоговой (13% НДФЛ) в Светлой теме
	console.log("Opening tax deduction sheet in light mode...");
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.setAttribute("data-theme", "light");
	});

	const taxNavBtn = page.locator('.tg-nav-btn:has-text("Налог 13%")');
	if (await taxNavBtn.count() > 0) {
		await taxNavBtn.click();
		await page.waitForTimeout(500);
	}

	const openTaxBtn = page.locator('button:has-text("Оформить справку КНД 1151156")');
	if (await openTaxBtn.count() > 0) {
		await openTaxBtn.click();
		await page.waitForTimeout(600);
	}

	const lightTaxSheetShot = path.join(outDir, "mobile_light_tax_sheet.png");
	await page.screenshot({ path: lightTaxSheetShot, fullPage: false });
	console.log(`Saved: ${lightTaxSheetShot}`);

	// 6. Шторка справки для налоговой (13% НДФЛ) в Тёмной теме
	console.log("Switching to dark mode for tax sheet...");
	await page.evaluate(() => {
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await page.waitForTimeout(500);

	const darkTaxSheetShot = path.join(outDir, "mobile_dark_tax_sheet.png");
	await page.screenshot({ path: darkTaxSheetShot, fullPage: false });
	console.log(`Saved: ${darkTaxSheetShot}`);

	await browser.close();
	console.log("All screenshots captured successfully!");
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
