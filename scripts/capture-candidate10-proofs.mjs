import { mkdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

async function captureCandidate10() {
	console.log("[Candidate 10 Capture] Launching Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 1000 },
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();

		console.log("[Candidate 10 Capture] Loading tournament page...");
		await page.goto(`${WEB_BASE}/?tournament=true#tournament`, { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForSelector('[data-testid="tournament-candidate-row-10"]', { timeout: 15000 });
		await page.waitForTimeout(1000);

		// 1. Light Mode Capture
		console.log("[Candidate 10 Capture] Capturing Light Mode...");
		const rowLight = await page.$('[data-testid="tournament-candidate-row-10"]');
		if (rowLight) {
			const lightOut = path.join(OUT_DIR, "candidate10_dente_signature_light.png");
			await rowLight.screenshot({ path: lightOut });
			console.log(`Saved Light: ${lightOut} (${statSync(lightOut).size} bytes)`);
		}

		// 2. Toggle to Dark Theme
		console.log("[Candidate 10 Capture] Toggling to Dark Mode...");
		await page.evaluate(() => {
			const btn = Array.from(document.querySelectorAll("button")).find((b) =>
				b.innerText.includes("Темная тема"),
			);
			if (btn) btn.click();
		});
		await page.waitForTimeout(600);

		// 3. Dark Mode Capture
		console.log("[Candidate 10 Capture] Capturing Dark Mode...");
		const rowDark = await page.$('[data-testid="tournament-candidate-row-10"]');
		if (rowDark) {
			const darkOut = path.join(OUT_DIR, "candidate10_dente_signature_dark.png");
			await rowDark.screenshot({ path: darkOut });
			console.log(`Saved Dark: ${darkOut} (${statSync(darkOut).size} bytes)`);
		}

		await context.close();
		console.log("[Candidate 10 Capture] Completed successfully!");
	} finally {
		await browser.close();
	}
}

captureCandidate10().catch((err) => {
	console.error("[Candidate 10 Capture Failed]:", err);
	process.exit(1);
});
