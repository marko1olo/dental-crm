import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/1bca513c-ea52-4d6f-ad16-869bf98d07b7/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/telegram_bot_studio";
const webBaseUrl = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function run() {
	console.log("Starting browser via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	// 1. PC Light (1440x900)
	console.log("Capturing 1. PC Light (1440x900)...");
	const pagePcLight = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pagePcLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pagePcLight.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pagePcLight.waitForSelector(".tg-phone-frame", { visible: true, timeout: 15000 });
	await pagePcLight.waitForTimeout(1000);

	const pcLightFile = "proof_telegram_bot_studio_pc_light.png";
	await pagePcLight.screenshot({ path: path.join(OUT_CONV, pcLightFile), fullPage: false });
	await pagePcLight.screenshot({ path: path.join(OUT_DOCS, pcLightFile), fullPage: false });
	console.log(`Saved ${pcLightFile}!`);
	await pagePcLight.close();

	// 2. PC Dark (1440x900)
	console.log("Capturing 2. PC Dark (1440x900)...");
	const pagePcDark = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pagePcDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pagePcDark.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pagePcDark.waitForSelector(".tg-phone-frame", { visible: true, timeout: 15000 });
	// Кликнем по пресету "Ортодонтия & Элайнеры" в Dark mode для демонстрации вариативности
	const orthoPresetBtn = pagePcDark.locator('.tg-preset-card:has-text("Ортодонтия")');
	if ((await orthoPresetBtn.count()) > 0) {
		console.log("Switching to Orthodontics preset in Dark mode...");
		await orthoPresetBtn.click();
		await pagePcDark.waitForTimeout(600);
	}

	await pagePcDark.waitForTimeout(1000);
	const pcDarkFile = "proof_telegram_bot_studio_pc_dark.png";
	await pagePcDark.screenshot({ path: path.join(OUT_CONV, pcDarkFile), fullPage: false });
	await pagePcDark.screenshot({ path: path.join(OUT_DOCS, pcDarkFile), fullPage: false });
	console.log(`Saved ${pcDarkFile}!`);
	await pagePcDark.close();

	// 3. Mobile Light (390x844)
	console.log("Capturing 3. Mobile Light (390x844)...");
	const pageMobLight = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await pageMobLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pageMobLight.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pageMobLight.waitForTimeout(1000);

	const mobLightFile = "proof_telegram_bot_studio_mobile_light.png";
	await pageMobLight.screenshot({ path: path.join(OUT_CONV, mobLightFile), fullPage: false });
	await pageMobLight.screenshot({ path: path.join(OUT_DOCS, mobLightFile), fullPage: false });
	console.log(`Saved ${mobLightFile}!`);
	await pageMobLight.close();

	// 4. Mobile Dark (390x844)
	console.log("Capturing 4. Mobile Dark (390x844)...");
	const pageMobDark = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await pageMobDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "networkidle",
		timeout: 30000,
	});
	await pageMobDark.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
	await pageMobDark.waitForTimeout(1000);

	const mobDarkFile = "proof_telegram_bot_studio_mobile_dark.png";
	await pageMobDark.screenshot({ path: path.join(OUT_CONV, mobDarkFile), fullPage: false });
	await pageMobDark.screenshot({ path: path.join(OUT_DOCS, mobDarkFile), fullPage: false });
	console.log(`Saved ${mobDarkFile}!`);
	await pageMobDark.close();

	console.log("ALL 4 SCREENSHOTS CAPTURED WITH 100% SUCCESS!");
	await browser.close();
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
