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
		// 1. KIOSK TERMINAL (PC 1440x900) - Light & Dark
		// ==========================================
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcContext.newPage();
		console.log("Loading Kiosk Terminal PC...");
		await safeGoto(pcPage, "http://127.0.0.1:5173/#/portal/kiosk");
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcPage.waitForTimeout(1500);

		// PC Light Kiosk
		await setTheme(pcPage, false);
		await captureProof(pcPage, "kiosk_terminal_pc_light_1440x900.png");

		// PC Dark Kiosk
		await setTheme(pcPage, true);
		await captureProof(pcPage, "kiosk_terminal_pc_dark_1440x900.png");

		await pcPage.close();
		await pcContext.close();

		// ==========================================
		// 2. KIOSK TERMINAL (MOBILE 390x844 Apple HIG) - Light & Dark
		// ==========================================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();
		console.log("Loading Kiosk Terminal Mobile...");
		await safeGoto(mobilePage, "http://127.0.0.1:5173/#/portal/kiosk");
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobilePage.waitForTimeout(1500);

		// Mobile Light Kiosk
		await setTheme(mobilePage, false);
		await captureProof(mobilePage, "kiosk_terminal_mobile_light_390x844.png");

		// Mobile Dark Kiosk
		await setTheme(mobilePage, true);
		await captureProof(mobilePage, "kiosk_terminal_mobile_dark_390x844.png");

		await mobilePage.close();
		await mobileContext.close();

		console.log("🎉 ALL 4-STATE KIOSK VISUAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
