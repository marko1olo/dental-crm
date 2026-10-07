import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_CONV = "C:/Users/Admin/.gemini/antigravity/brain/b5f88b4f-0fc6-4a0a-b60f-724a3ab8b3d9/screenshots";
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/telegram_integration_hub";
const webBaseUrl = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function run() {
	console.log("Launching browser via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	// 1. Desktop Light (1440x900) - Bot Tab
	console.log("1. Capturing Desktop Light (1440x900) - Bot Tab...");
	const pageDeskLight = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pageDeskLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageDeskLight.waitForSelector('[data-testid="telegram-integration-hub"]', {
		visible: true,
		timeout: 15000,
	});
	await pageDeskLight.waitForSelector('[data-testid="tg-bot-pane"]', {
		visible: true,
		timeout: 15000,
	});
	await pageDeskLight.waitForTimeout(1000);

	const deskLightFile = "proof_telegram_hub_desktop_light_bot.png";
	await pageDeskLight.screenshot({ path: path.join(OUT_CONV, deskLightFile), fullPage: false });
	await pageDeskLight.screenshot({ path: path.join(OUT_DOCS, deskLightFile), fullPage: false });
	console.log(`Saved ${deskLightFile}`);
	await pageDeskLight.close();

	// 2. Desktop Dark (1440x900) - Bot Tab
	console.log("2. Capturing Desktop Dark (1440x900) - Bot Tab...");
	const pageDeskDark = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pageDeskDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageDeskDark.waitForSelector('[data-testid="telegram-integration-hub"]', {
		visible: true,
		timeout: 15000,
	});
	await pageDeskDark.waitForSelector('[data-testid="tg-bot-pane"]', {
		visible: true,
		timeout: 15000,
	});
	await pageDeskDark.waitForTimeout(1000);

	const deskDarkFile = "proof_telegram_hub_desktop_dark_bot.png";
	await pageDeskDark.screenshot({ path: path.join(OUT_CONV, deskDarkFile), fullPage: false });
	await pageDeskDark.screenshot({ path: path.join(OUT_DOCS, deskDarkFile), fullPage: false });
	console.log(`Saved ${deskDarkFile}`);
	await pageDeskDark.close();

	// 3. Desktop Light (1440x900) - Личный аккаунт (Phone / Code)
	console.log("3. Capturing Desktop Light (1440x900) - Personal Account Phone...");
	const pageAccountPhone = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await pageAccountPhone.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageAccountPhone.waitForSelector('[data-testid="tg-hub-tab-account"]', {
		visible: true,
		timeout: 15000,
	});
	await pageAccountPhone.click('[data-testid="tg-hub-tab-account"]');
	await pageAccountPhone.waitForSelector('[data-testid="tg-account-pane"]', {
		visible: true,
		timeout: 15000,
	});
	await pageAccountPhone.fill('[data-testid="tg-account-phone-input"]', "+7 (999) 777-88-99");
	await pageAccountPhone.waitForTimeout(800);

	const deskAccountFile = "proof_telegram_hub_desktop_light_account_phone.png";
	await pageAccountPhone.screenshot({ path: path.join(OUT_CONV, deskAccountFile), fullPage: false });
	await pageAccountPhone.screenshot({ path: path.join(OUT_DOCS, deskAccountFile), fullPage: false });
	console.log(`Saved ${deskAccountFile}`);
	await pageAccountPhone.close();

const dummyQrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%"><rect width="100%" height="100%" fill="#ffffff"/><path d="M20 20h60v60h-60zM30 30v40h40v-40zM45 45h10v10h-10zM160 20h60v60h-60zM170 30v40h40v-40zM185 45h10v10h-10zM20 160h60v60h-60zM30 170v40h40v-40zM45 185h10v10h-10zM100 20h10v30h-10zM120 20h20v10h-20zM100 70h30v10h-30zM140 50h10v30h-10zM20 100h20v20h-20zM60 100h20v10h-20zM70 120h20v20h-20zM100 100h40v40h-40zM110 110v20h20v-20zM160 100h20v10h-20zM190 100h30v20h-30zM160 130h10v20h-10zM200 130h20v10h-20zM100 160h20v30h-20zM130 160h10v20h-10zM100 210h30v10h-30zM150 170h20v20h-20zM180 160h10v20h-10zM200 170h20v30h-20zM170 200h20v20h-20z" fill="#0f172a"/></svg>`;

async function setupQrRoute(page) {
	await page.route("**/api/telegram/account/request-qr", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				ok: true,
				token: "demo_qr_token_7788",
				qrPayload: "tg://login?token=demo_qr_token_7788",
				qrSvg: dummyQrSvg,
				expiresIn: 300,
				expiresAt: new Date(Date.now() + 300000).toISOString(),
			}),
		});
	});
}

	// 4. Desktop Dark (1440x900) - Личный аккаунт (QR-код)
	console.log("4. Capturing Desktop Dark (1440x900) - Personal Account QR...");
	const pageAccountQr = await browser.newPage({
		viewport: { width: 1440, height: 900 },
	});
	await setupQrRoute(pageAccountQr);
	await pageAccountQr.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageAccountQr.waitForSelector('[data-testid="tg-hub-tab-account"]', {
		visible: true,
		timeout: 15000,
	});
	await pageAccountQr.click('[data-testid="tg-hub-tab-account"]');
	await pageAccountQr.waitForSelector('[data-testid="tg-account-tab-qr"]', {
		visible: true,
		timeout: 15000,
	});
	await pageAccountQr.click('[data-testid="tg-account-tab-qr"]');
	await pageAccountQr.waitForTimeout(1200);

	const deskQrFile = "proof_telegram_hub_desktop_dark_account_qr.png";
	await pageAccountQr.screenshot({ path: path.join(OUT_CONV, deskQrFile), fullPage: false });
	await pageAccountQr.screenshot({ path: path.join(OUT_DOCS, deskQrFile), fullPage: false });
	console.log(`Saved ${deskQrFile}`);
	await pageAccountQr.close();

	// 5. Mobile Light (390x844) - Apple HIG
	console.log("5. Capturing Mobile Light (390x844)...");
	const pageMobLight = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await pageMobLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageMobLight.waitForSelector('[data-testid="telegram-integration-hub"]', {
		visible: true,
		timeout: 15000,
	});
	await pageMobLight.waitForTimeout(1000);

	const mobLightFile = "proof_telegram_hub_mobile_light.png";
	await pageMobLight.screenshot({ path: path.join(OUT_CONV, mobLightFile), fullPage: false });
	await pageMobLight.screenshot({ path: path.join(OUT_DOCS, mobLightFile), fullPage: false });
	console.log(`Saved ${mobLightFile}`);
	await pageMobLight.close();

	// 6. Mobile Dark (390x844) - Личный аккаунт QR
	console.log("6. Capturing Mobile Dark (390x844)...");
	const pageMobDark = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await setupQrRoute(pageMobDark);
	await pageMobDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await pageMobDark.waitForSelector('[data-testid="tg-hub-tab-account"]', {
		visible: true,
		timeout: 15000,
	});
	await pageMobDark.click('[data-testid="tg-hub-tab-account"]');
	await pageMobDark.waitForSelector('[data-testid="tg-account-tab-qr"]', {
		visible: true,
		timeout: 15000,
	});
	await pageMobDark.click('[data-testid="tg-account-tab-qr"]');
	await pageMobDark.waitForTimeout(1200);

	const mobDarkFile = "proof_telegram_hub_mobile_dark_qr.png";
	await pageMobDark.screenshot({ path: path.join(OUT_CONV, mobDarkFile), fullPage: false });
	await pageMobDark.screenshot({ path: path.join(OUT_DOCS, mobDarkFile), fullPage: false });
	console.log(`Saved ${mobDarkFile}`);
	await pageMobDark.close();

	await browser.close();
	console.log("ALL TELEGRAM HUB SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
