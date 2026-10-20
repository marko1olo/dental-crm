import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/ct");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/9ee7b21b-0d90-4f2d-9711-4903ac26f42a";

const ALL_DIRS = [PROOFS_DIR, BRAIN_DIR];
for (const dir of ALL_DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
	console.log("=== CAPTURING REAL CT SELECTOR & LAUNCHER VISUAL PROOF SCREENSHOTS ===");

	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : undefined);

	const browser = await chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : { channel: "msedge" }),
	});

	try {
		// 1. PC DARK (1440x900)
		console.log("1. Capturing PC Dark 1440x900...");
		const contextDark = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "dark",
		});
		const pageDark = await contextDark.newPage();
		pageDark.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
		pageDark.on("pageerror", (err) => console.error("PAGE ERROR:", err));
		await pageDark.goto("http://127.0.0.1:5173/?ct-selector=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageDark.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await sleep(800);

		const modalDark = pageDark.locator('[data-testid="ct-selector-modal"]');
		await modalDark.waitFor({ state: "visible", timeout: 15000 });
		await sleep(500);

		const darkPath = path.join(PROOFS_DIR, "ct_launcher_modal_dark.png");
		await pageDark.screenshot({ path: darkPath });
		fs.copyFileSync(darkPath, path.join(BRAIN_DIR, "ct_launcher_modal_dark.png"));
		console.log(`Saved ct_launcher_modal_dark.png (${(fs.statSync(darkPath).size / 1024).toFixed(1)} KB)`);

		// Switch to external_app mode in dark theme
		const extAppBtnDark = pageDark.locator('[data-testid="mode-external-app"]');
		await extAppBtnDark.click();
		await sleep(500);
		const darkExtPath = path.join(PROOFS_DIR, "ct_launcher_external_dark.png");
		await pageDark.screenshot({ path: darkExtPath });
		fs.copyFileSync(darkExtPath, path.join(BRAIN_DIR, "ct_launcher_external_dark.png"));
		console.log(`Saved ct_launcher_external_dark.png (${(fs.statSync(darkExtPath).size / 1024).toFixed(1)} KB)`);
		await contextDark.close();

		// 2. PC LIGHT (1440x900)
		console.log("2. Capturing PC Light 1440x900...");
		const contextLight = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const pageLight = await contextLight.newPage();
		await pageLight.goto("http://127.0.0.1:5173/?ct-selector=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await pageLight.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await sleep(800);

		const modalLight = pageLight.locator('[data-testid="ct-selector-modal"]');
		await modalLight.waitFor({ state: "visible", timeout: 15000 });
		await sleep(500);

		const lightPath = path.join(PROOFS_DIR, "ct_launcher_modal_light.png");
		await pageLight.screenshot({ path: lightPath });
		fs.copyFileSync(lightPath, path.join(BRAIN_DIR, "ct_launcher_modal_light.png"));
		console.log(`Saved ct_launcher_modal_light.png (${(fs.statSync(lightPath).size / 1024).toFixed(1)} KB)`);

		// Switch to external_app mode in light theme
		const extAppBtnLight = pageLight.locator('[data-testid="mode-external-app"]');
		await extAppBtnLight.click();
		await sleep(500);
		const lightExtPath = path.join(PROOFS_DIR, "ct_launcher_external_light.png");
		await pageLight.screenshot({ path: lightExtPath });
		fs.copyFileSync(lightExtPath, path.join(BRAIN_DIR, "ct_launcher_external_light.png"));
		console.log(`Saved ct_launcher_external_light.png (${(fs.statSync(lightExtPath).size / 1024).toFixed(1)} KB)`);
		await contextLight.close();

		console.log("=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
