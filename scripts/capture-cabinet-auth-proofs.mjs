import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/portal");

async function run() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});
	try {
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/#/portal/booking/demo-clinic", { waitUntil: "commit" });
		await pcPage.waitForSelector(".PublicBookingWidget-root", { timeout: 15000 }).catch(() => {});
		await pcPage.waitForTimeout(1000);

		// Кликаем на кнопку «Личный кабинет»
		const cabinetBtn = pcPage.locator("button:has-text('Личный кабинет')").first();
		await cabinetBtn.click();
		await pcPage.waitForTimeout(1000);

		// PC Light Auth
		await pcPage.screenshot({ path: path.join(OUT_DIR, "portal_auth_pc_light_1440x900.png") });

		// PC Dark Auth
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		});
		await pcPage.waitForTimeout(600);
		await pcPage.screenshot({ path: path.join(OUT_DIR, "portal_auth_pc_dark_1440x900.png") });
		await pcPage.close();
		await pcContext.close();

		// Mobile 390x844
		const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
		const mobPage = await mobContext.newPage();
		await mobPage.goto("http://127.0.0.1:5173/#/portal/booking/demo-clinic", { waitUntil: "commit" });
		await mobPage.waitForSelector(".PublicBookingWidget-root", { timeout: 15000 }).catch(() => {});
		await mobPage.waitForTimeout(1000);

		const mobCabinetBtn = mobPage.locator("button:has-text('Личный кабинет')").first();
		await mobCabinetBtn.click();
		await mobPage.waitForTimeout(1000);

		// Mobile Light Auth
		await mobPage.screenshot({ path: path.join(OUT_DIR, "portal_auth_mobile_light_390x844.png") });

		// Mobile Dark Auth
		await mobPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		});
		await mobPage.waitForTimeout(600);
		await mobPage.screenshot({ path: path.join(OUT_DIR, "portal_auth_mobile_dark_390x844.png") });
		await mobPage.close();
		await mobContext.close();

		console.log("Cabinet Auth Proofs Captured Successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
