import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
	const outDir = path.join(__dirname, "../docs/proofs/radiology");
	fs.mkdirSync(outDir, { recursive: true });

	const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
		? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
		: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

	console.log(`Using browser: ${chromePath}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: chromePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	async function captureState(name, width, height, isDark, isMobile) {
		const context = await browser.newContext({
			viewport: { width, height },
			isMobile: isMobile,
			hasTouch: isMobile,
			deviceScaleFactor: 2,
			colorScheme: isDark ? "dark" : "light",
		});

		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?demo=true#imaging", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(2000);

		await page.evaluate((dark) => {
			document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
			if (dark) {
				document.documentElement.classList.add("dark");
				document.body.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.body.classList.remove("dark");
			}
			window.location.hash = "imaging";
		}, isDark);

		await page.waitForTimeout(1000);

		// If on desktop, let's open the Radiology Module modal to showcase the studio Hub
		if (!isMobile) {
			const moreBtn = await page.$('[data-testid="imaging-more-menu-btn"]');
			if (moreBtn) {
				await moreBtn.click();
				await page.waitForTimeout(500);
				const radBtn = await page.$('[data-testid="imaging-open-radiology-module"]');
				if (radBtn) {
					await radBtn.click();
					await page.waitForTimeout(1000);
				}
			}
		}

		const filePath = path.join(outDir, name);
		await page.screenshot({ path: filePath, fullPage: false });
		console.log(`Saved screenshot: ${filePath} (${fs.statSync(filePath).size} bytes)`);
		await context.close();
	}

	console.log("Capturing 4-state visual proofs...");
	await captureState("radiology_studio_pc_light_1440x900.png", 1440, 900, false, false);
	await captureState("radiology_studio_pc_dark_1440x900.png", 1440, 900, true, false);
	await captureState("radiology_studio_mobile_light_390x844.png", 390, 844, false, true);
	await captureState("radiology_studio_mobile_dark_390x844.png", 390, 844, true, true);

	await browser.close();
	console.log("All 4 screenshots captured successfully!");
}

capture().catch((err) => {
	console.error("Capture error:", err);
	process.exit(1);
});
