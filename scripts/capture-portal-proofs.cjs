const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET_DIR = path.resolve(__dirname, "../docs/proofs/portal");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/69cb45a3-13eb-41e0-9edf-bc5dcef5ebce/proofs");

if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}
if (!fs.existsSync(BRAIN_DIR)) {
	fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

const configs = [
	{
		filename: "01_patient_portal_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		filename: "02_patient_portal_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
	{
		filename: "03_patient_portal_mobile_light_390x844.png",
		viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
		theme: "light",
	},
	{
		filename: "04_patient_portal_mobile_dark_390x844.png",
		viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
		theme: "dark",
	},
];

async function capture() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		for (const cfg of configs) {
			const page = await browser.newPage();
			await page.setViewport(cfg.viewport);
			await page.emulateMediaFeatures([
				{ name: "prefers-color-scheme", value: cfg.theme },
			]);

			console.log(`Navigating to http://127.0.0.1:5173/#/book/demo-clinic for ${cfg.filename}...`);
			await page.goto("http://127.0.0.1:5173/#/book/demo-clinic", {
				waitUntil: "domcontentloaded",
				timeout: 20000,
			});

			await page.evaluate((theme) => {
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(theme);
				document.documentElement.setAttribute("data-theme", theme);
				try {
					localStorage.setItem("dental_theme", theme);
				} catch (_) {}
			}, cfg.theme);

			await wait(2000);

			const targetPath = path.join(TARGET_DIR, cfg.filename);
			await page.screenshot({ path: targetPath, fullPage: false });

			const brainPath = path.join(BRAIN_DIR, cfg.filename);
			fs.copyFileSync(targetPath, brainPath);

			const content = fs.readFileSync(targetPath);
			const hash = crypto.createHash("md5").update(content).digest("hex");

			console.log(`Captured: ${cfg.filename} (${content.length} bytes, md5: ${hash})`);
			await page.close();
		}
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
