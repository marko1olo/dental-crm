import path from "node:path";
import { chromium } from "playwright";

const ARTIFACT_DIR =
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bb25bcf6-b417-4d6b-8825-0189fff20e2b";

async function run() {
	const browser = await chromium.launch({ headless: true });

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();

		console.log("Navigating to app...");
		await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
		await page.waitForTimeout(1000);

		// Attempt Login
		console.log("Attempting login...");
		try {
			await page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll("button"));
				const loginBtn = buttons.find((b) => b.textContent?.includes("Войти"));
				if (loginBtn) loginBtn.click();
			});
			await page.waitForTimeout(3000);
			console.log("Login clicked");
		} catch (_e) {
			console.log("No login button found or already logged in.");
		}

		// 1. Desktop Light Mode
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(500);
		await page.screenshot({
			path: path.join(ARTIFACT_DIR, "desktop_light.png"),
			fullPage: true,
		});
		console.log("Took desktop_light.png");

		// Click around to show details (e.g. patients, schedule)
		try {
			await page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll("button, a"));
				const patientsBtn = buttons.find((b) =>
					b.textContent?.includes("Пациенты"),
				);
				if (patientsBtn) patientsBtn.click();
			});
			await page.waitForTimeout(2000);
			// Pick the first patient
			await page.evaluate(() => {
				const rows = Array.from(
					document.querySelectorAll("td, .patient-card, li"),
				);
				if (rows.length > 0) rows[0].click();
			});
			await page.waitForTimeout(2000);
			await page.screenshot({
				path: path.join(ARTIFACT_DIR, "desktop_light_patient.png"),
				fullPage: true,
			});
		} catch (e) {
			console.log("Could not navigate to patient:", e.message);
		}

		// 2. Desktop Dark Mode
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(500);
		await page.screenshot({
			path: path.join(ARTIFACT_DIR, "desktop_dark.png"),
			fullPage: true,
		});
		console.log("Took desktop_dark.png");

		// 3. Mobile Viewport
		const mobileContext = await browser.newContext({
			viewport: { width: 375, height: 812 },
			isMobile: true,
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://localhost:5173", {
			waitUntil: "networkidle",
		});
		await mobilePage.waitForTimeout(2000);

		// Mobile Dark
		await mobilePage.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await mobilePage.waitForTimeout(500);
		await mobilePage.screenshot({
			path: path.join(ARTIFACT_DIR, "mobile_dark.png"),
			fullPage: true,
		});
		console.log("Took mobile_dark.png");

		// Mobile Light
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await mobilePage.waitForTimeout(500);
		await mobilePage.screenshot({
			path: path.join(ARTIFACT_DIR, "mobile_light.png"),
			fullPage: true,
		});
		console.log("Took mobile_light.png");
	} catch (err) {
		console.error(err);
	} finally {
		await browser.close();
	}
}

run();
