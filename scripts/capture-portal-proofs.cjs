const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET_DIR = path.resolve(__dirname, "../docs/proofs/portal");

if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
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
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		for (const cfg of configs) {
			const page = await browser.newPage();
			await page.setViewport(cfg.viewport);
			await page.emulateMediaFeatures([
				{ name: "prefers-color-scheme", value: cfg.theme },
			]);

			console.log(`Navigating to http://localhost:5173/book for ${cfg.filename}...`);
			await page.goto("http://localhost:5173/book", {
				waitUntil: "networkidle0",
				timeout: 30000,
			});

			// Применяем тему на уровне DOM и documentElement
			await page.evaluate((theme) => {
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(theme);
				document.documentElement.setAttribute("data-theme", theme);
				localStorage.setItem("dental_theme", theme);
			}, cfg.theme);

			await wait(2000);

			const targetPath = path.join(TARGET_DIR, cfg.filename);
			await page.screenshot({ path: targetPath, fullPage: false });

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
