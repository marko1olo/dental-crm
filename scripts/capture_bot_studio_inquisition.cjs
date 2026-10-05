const { mkdir } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const CONV_ID = "e02712b1-0eab-4bd9-a2bb-0fb05b90a1dd";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
const webBaseUrl = "http://127.0.0.1:5173";

async function run() {
	await mkdir(OUT_CONV, { recursive: true });
	await mkdir(OUT_DOCS, { recursive: true });

	console.log("Launching browser via Playwright...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	// 1. PC Light (1440x900)
	console.log("Capturing 1. Bot Studio PC Light (1440x900)...");
	const pagePcLight = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pagePcLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pagePcLight.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pagePcLight.waitForTimeout(800);

	const pcLightFile = "proof_bot_studio_pc_light.png";
	await pagePcLight.screenshot({ path: path.join(OUT_CONV, pcLightFile), fullPage: false });
	await pagePcLight.screenshot({ path: path.join(OUT_DOCS, pcLightFile), fullPage: false });
	console.log(`Saved ${pcLightFile}`);
	await pagePcLight.close();

	// 2. PC Dark (1440x900)
	console.log("Capturing 2. Bot Studio PC Dark (1440x900)...");
	const pagePcDark = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pagePcDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pagePcDark.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pagePcDark.waitForTimeout(800);

	const pcDarkFile = "proof_bot_studio_pc_dark.png";
	await pagePcDark.screenshot({ path: path.join(OUT_CONV, pcDarkFile), fullPage: false });
	await pagePcDark.screenshot({ path: path.join(OUT_DOCS, pcDarkFile), fullPage: false });
	console.log(`Saved ${pcDarkFile}`);
	await pagePcDark.close();

	// 3. Mobile Light (390x844)
	console.log("Capturing 3. Bot Studio Mobile Light (390x844)...");
	const pageMobLight = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await pageMobLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pageMobLight.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pageMobLight.waitForTimeout(800);

	const mobLightFile = "proof_bot_studio_mobile_light.png";
	await pageMobLight.screenshot({ path: path.join(OUT_CONV, mobLightFile), fullPage: false });
	await pageMobLight.screenshot({ path: path.join(OUT_DOCS, mobLightFile), fullPage: false });
	console.log(`Saved ${mobLightFile}`);
	await pageMobLight.close();

	// 4. Mobile Dark (390x844)
	console.log("Capturing 4. Bot Studio Mobile Dark (390x844)...");
	const pageMobDark = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await pageMobDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pageMobDark.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pageMobDark.waitForTimeout(800);

	const mobDarkFile = "proof_bot_studio_mobile_dark.png";
	await pageMobDark.screenshot({ path: path.join(OUT_CONV, mobDarkFile), fullPage: false });
	await pageMobDark.screenshot({ path: path.join(OUT_DOCS, mobDarkFile), fullPage: false });
	console.log(`Saved ${mobDarkFile}`);
	await pageMobDark.close();

	await browser.close();
	console.log("Done capturing Bot Studio screenshots!");
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
