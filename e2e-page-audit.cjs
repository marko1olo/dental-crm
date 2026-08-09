const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROUTES = [
	"/",
	"/schedule",
	"/patients",
	"/imaging",
	"/visit",
	"/documents",
	"/finance",
	"/analytics",
	"/communications",
	"/inventory",
	"/scanner",
	"/leads",
	"/settings",
];

const OUT_DIR =
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\a4816d4c-324b-4377-a1a5-7447446ea0af\\screenshots";
const REPORT_PATH =
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\a4816d4c-324b-4377-a1a5-7447446ea0af\\page_audit_report.json";

if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function runAudit() {
	console.log("Starting Deep Visual E2E Crawler...");
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
	});
	const page = await context.newPage();

	const report = [];

	try {
		console.log("Navigating to root to authenticate...");
		await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });

		// Try to click Demo login if it exists
		const demoBtn = page.getByRole("button", { name: /demo|test/i }).first();
		if (await demoBtn.isVisible()) {
			await demoBtn.click();
			await page.waitForLoadState("networkidle");
		} else {
			// Assume we need to login via form
			const emailInput = page.locator('input[type="email"]');
			if (await emailInput.isVisible()) {
				await emailInput.fill("doctor@clinic.com");
				const passInput = page.locator('input[type="password"]');
				if (await passInput.isVisible()) await passInput.fill("any");
				await page.getByRole("button", { name: /Войти|Вход|Login/i }).click();
				await page.waitForLoadState("networkidle");
			}
		}

		console.log("Authenticated. Checking for onboarding modal...");

		try {
			const skipOnboarding = await page.waitForSelector(
				'text="Сначала осмотреться"',
				{ timeout: 5000 },
			);
			console.log("Bypassing onboarding modal...");
			await skipOnboarding.click();
			await page.waitForLoadState("networkidle");
		} catch (e) {
			console.log("No onboarding modal found, continuing...");
		}

		console.log("Starting route crawler...");

		for (const route of ROUTES) {
			console.log(`Auditing: ${route}`);
			const errors = [];
			const warnings = [];

			const onConsole = (msg) => {
				if (msg.type() === "error") errors.push(msg.text());
				if (msg.type() === "warning") warnings.push(msg.text());
			};
			const onPageError = (err) => errors.push(err.message);

			page.on("console", onConsole);
			page.on("pageerror", onPageError);

			const startTime = Date.now();
			await page.goto(`http://127.0.0.1:5173/#${route}`, {
				waitUntil: "networkidle",
			});
			const loadTime = Date.now() - startTime;

			// Small delay for animations/renders
			await page.waitForTimeout(1000);

			const safeName = route === "/" ? "root" : route.replace(/\//g, "_");
			const screenshotPath = path.join(OUT_DIR, `${safeName}.png`);
			await page.screenshot({ path: screenshotPath, fullPage: true });

			page.off("console", onConsole);
			page.off("pageerror", onPageError);

			report.push({
				route,
				screenshot: screenshotPath,
				loadTimeMs: loadTime,
				errorCount: errors.length,
				errors,
				warningsCount: warnings.length,
			});
		}

		fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
		console.log(`\nAudit complete! Report saved to ${REPORT_PATH}`);
	} catch (err) {
		console.error("Crawler failed:", err);
	} finally {
		await browser.close();
	}
}

runAudit();
