const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const outDir = path.resolve(__dirname, "../docs/proofs/omnichannel");
if (!fs.existsSync(outDir)) {
	fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const targets = [
		{
			name: "01_omnichannel_hub_pc_light.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			name: "02_omnichannel_hub_pc_dark.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			name: "03_omnichannel_hub_mobile_light.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			name: "04_omnichannel_hub_mobile_dark.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		},
	];

	for (const target of targets) {
		console.log(`Capturing ${target.name} (${target.width}x${target.height}, ${target.theme})...`);
		const context = await browser.newContext({
			viewport: { width: target.width, height: target.height },
			isMobile: target.isMobile,
			hasTouch: target.isMobile,
			colorScheme: target.theme,
		});

		const page = await context.newPage();

		await page.addInitScript((theme) => {
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_is_demo", "true");
		}, target.theme);

		const url = "http://127.0.0.1:5173/?demo=true#messages";
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Ensure theme class on root
		await page.evaluate((theme) => {
			const root = document.documentElement;
			if (theme === "dark") {
				root.classList.add("dark");
				root.classList.remove("light");
				root.setAttribute("data-theme", "dark");
			} else {
				root.classList.remove("dark");
				root.classList.add("light");
				root.setAttribute("data-theme", "light");
			}
		}, target.theme);

		await page.waitForTimeout(500);

		const filePath = path.join(outDir, target.name);
		await page.screenshot({ path: filePath, fullPage: false });
		const stats = fs.statSync(filePath);
		console.log(`Saved ${target.name}: ${stats.size} bytes`);

		await context.close();
	}

	await browser.close();
	console.log("All 4 proofs successfully captured!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
