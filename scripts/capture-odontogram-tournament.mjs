import { mkdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
	console.log("[Tournament Capture] Launching Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 2400 },
			deviceScaleFactor: 1.5,
		});

		const page = await context.newPage();

		// 1. Light Theme
		console.log("[Tournament Capture] Capturing Light Theme...");
		await page.goto(`${WEB_BASE}/?demo=true#tournament`, { waitUntil: "commit", timeout: 30000 });
		await page.waitForTimeout(3000);

		// Ensure light theme in body
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			const lightBtn = Array.from(document.querySelectorAll("button")).find((b) =>
				b.innerText.includes("Светлая тема"),
			);
			if (lightBtn) lightBtn.click();
		});
		await page.waitForTimeout(1000);

		const lightOut = path.join(OUT_DIR, "tournament_10_candidates_light.png");
		await page.screenshot({ path: lightOut, fullPage: true });
		console.log(`Saved Light: ${lightOut} (${statSync(lightOut).size} bytes)`);

		// 2. Dark Theme
		console.log("[Tournament Capture] Capturing Dark Theme...");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.classList.remove("light");
			document.body.classList.add("dark");
			const darkBtn = Array.from(document.querySelectorAll("button")).find((b) =>
				b.innerText.includes("Темная тема"),
			);
			if (darkBtn) darkBtn.click();
		});
		await page.waitForTimeout(1000);

		const darkOut = path.join(OUT_DIR, "tournament_10_candidates_dark.png");
		await page.screenshot({ path: darkOut, fullPage: true });
		console.log(`Saved Dark: ${darkOut} (${statSync(darkOut).size} bytes)`);

		await context.close();
		console.log("[Tournament Capture] Completed successfully!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[Tournament Capture Failed]:", err);
	process.exit(1);
});
