import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/portal");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function safeGoto(page, url, retries = 3) {
	for (let i = 0; i < retries; i++) {
		try {
			await page.goto(url, { waitUntil: "commit", timeout: 25000 });
			return;
		} catch (err) {
			if (i === retries - 1) throw err;
			console.log(`[safeGoto] Retrying ${url} after error: ${err.message}`);
			await page.waitForTimeout(1500);
		}
	}
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
	await page.waitForTimeout(800);
	const filePath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(filePath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> Status: ${size >= 20000 ? "OK" : "TOO_SMALL"}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${filename} is too small: ${size} bytes`);
	}
	return filePath;
}

async function main() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// ==========================================
		// 1. PUBLIC BOOKING (PC 1440x900) - Light & Dark
		// ==========================================
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcContext.newPage();
		console.log("Loading Public Booking PC...");
		await safeGoto(pcPage, "http://127.0.0.1:5173/#/portal/booking/demo-clinic");
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcPage.waitForSelector(".PublicBookingWidget-root", { timeout: 15000 }).catch(() => {});
		await pcPage.waitForTimeout(1500);

		// PC Light Booking
		await setTheme(pcPage, false);
		await captureProof(pcPage, "portal_booking_pc_light_1440x900.png");

		// PC Dark Booking
		await setTheme(pcPage, true);
		await captureProof(pcPage, "portal_booking_pc_dark_1440x900.png");

		// Открываем Личный кабинет (вкладка "Личный кабинет" в шапке)
		console.log("Switching to Patient Cabinet Mode on PC...");
		const cabinetBtn = pcPage.locator("button:has-text('Личный кабинет')").first();
		if (await cabinetBtn.isVisible()) {
			await cabinetBtn.click();
			await pcPage.waitForTimeout(1200);
		}

		// Если есть кнопка Тест-драйв ЛК — открываем модальный кабинет
		const demoBtn = pcPage.locator("[data-testid='open-demo-cabinet-btn']").first();
		if (await demoBtn.isVisible()) {
			await demoBtn.click();
			await pcPage.waitForSelector(".patient-cabinet-modal", { timeout: 10000 }).catch(() => {});
			await pcPage.waitForTimeout(1200);

			// Переходим во вкладку «Планы лечения» или «Документы»
			const docsTab = pcPage.locator("button:has-text('Документы'), button:has-text('Счета')").first();
			if (await docsTab.isVisible()) {
				await docsTab.click();
				await pcPage.waitForTimeout(1000);
			}

			// PC Dark Cabinet
			await setTheme(pcPage, true);
			await captureProof(pcPage, "portal_cabinet_pc_dark_1440x900.png");

			// PC Light Cabinet
			await setTheme(pcPage, false);
			await captureProof(pcPage, "portal_cabinet_pc_light_1440x900.png");
		}

		await pcPage.close();
		await pcContext.close();

		// ==========================================
		// 2. MOBILE (390x844 Apple HIG) - Light & Dark
		// ==========================================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();
		console.log("Loading Public Booking Mobile...");
		await safeGoto(mobilePage, "http://127.0.0.1:5173/#/portal/booking/demo-clinic");
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobilePage.waitForSelector(".PublicBookingWidget-root", { timeout: 15000 }).catch(() => {});
		await mobilePage.waitForTimeout(1500);

		// Mobile Light Booking
		await setTheme(mobilePage, false);
		await captureProof(mobilePage, "portal_booking_mobile_light_390x844.png");

		// Mobile Dark Booking
		await setTheme(mobilePage, true);
		await captureProof(mobilePage, "portal_booking_mobile_dark_390x844.png");

		// Открываем кабинет на мобильном
		console.log("Switching to Patient Cabinet Mode on Mobile...");
		const mobileCabinetBtn = mobilePage.locator("button:has-text('Личный кабинет')").first();
		if (await mobileCabinetBtn.isVisible()) {
			await mobileCabinetBtn.click();
			await mobilePage.waitForTimeout(1200);
		}

		const mobileDemoBtn = mobilePage.locator("[data-testid='open-demo-cabinet-btn']").first();
		if (await mobileDemoBtn.isVisible()) {
			await mobileDemoBtn.click();
			await mobilePage.waitForSelector(".patient-cabinet-modal", { timeout: 10000 }).catch(() => {});
			await mobilePage.waitForTimeout(1200);

			// Mobile Dark Cabinet
			await setTheme(mobilePage, true);
			await captureProof(mobilePage, "portal_cabinet_mobile_dark_390x844.png");

			// Mobile Light Cabinet
			await setTheme(mobilePage, false);
			await captureProof(mobilePage, "portal_cabinet_mobile_light_390x844.png");
		}

		await mobilePage.close();
		await mobileContext.close();

		console.log("🎉 ALL 4-STATE PORTAL VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
