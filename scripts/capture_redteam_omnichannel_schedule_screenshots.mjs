import { mkdir } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";

const CONV_ID = "1129a0d2-76ca-4a90-9e6d-6013590411aa";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/redteam_inquisition";
const webBaseUrl = "http://127.0.0.1:5173";

await mkdir(OUT_CONV, { recursive: true });
await mkdir(OUT_DOCS, { recursive: true });

async function run() {
	console.log("Launching Microsoft Edge via Playwright...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// -----------------------------------------------------------------
		// 1. MESSENGERS STUDIO & TELEGRAM / WHATSAPP / VK HUB (PC LIGHT)
		// -----------------------------------------------------------------
		console.log("1. Capturing Messengers Studio PC Light (1440x900)...");
		const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageLight.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=light`, {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await pageLight.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
		await pageLight.waitForTimeout(1000);

		const lightFile = "proof_messengers_studio_pc_light.png";
		const lightPathConv = path.join(OUT_CONV, lightFile);
		const lightPathDocs = path.join(OUT_DOCS, lightFile);
		await pageLight.screenshot({ path: lightPathConv, fullPage: false });
		await pageLight.screenshot({ path: lightPathDocs, fullPage: false });
		const lightStat = fs.statSync(lightPathConv);
		console.log(`Saved ${lightFile} (${lightStat.size} bytes)`);
		await pageLight.close();

		// -----------------------------------------------------------------
		// 2. MESSENGERS STUDIO & TELEGRAM / WHATSAPP / VK HUB (PC DARK)
		// -----------------------------------------------------------------
		console.log("2. Capturing Messengers Studio PC Dark (1440x900)...");
		const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageDark.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=dark`, {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await pageDark.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
		await pageDark.waitForTimeout(1000);

		const darkFile = "proof_messengers_studio_pc_dark.png";
		const darkPathConv = path.join(OUT_CONV, darkFile);
		const darkPathDocs = path.join(OUT_DOCS, darkFile);
		await pageDark.screenshot({ path: darkPathConv, fullPage: false });
		await pageDark.screenshot({ path: darkPathDocs, fullPage: false });
		const darkStat = fs.statSync(darkPathConv);
		console.log(`Saved ${darkFile} (${darkStat.size} bytes)`);
		await pageDark.close();

		// -----------------------------------------------------------------
		// 3. SCHEDULE WAITLIST QUICK FILL & RECOVERY (PC LIGHT)
		// -----------------------------------------------------------------
		console.log("3. Capturing Schedule Waitlist Quick Fill PC Light (1440x900)...");
		const pageScheduleLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageScheduleLight.goto(`${webBaseUrl}/waitlist_quickfill_preview.html?theme=light`, {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await pageScheduleLight.waitForSelector('[data-testid="waitlist-quickfill-modal"]', { visible: true, timeout: 15000 });
		await pageScheduleLight.waitForTimeout(1000);

		const schedLightFile = "proof_waitlist_schedule_pc_light.png";
		const schedLightPathConv = path.join(OUT_CONV, schedLightFile);
		const schedLightPathDocs = path.join(OUT_DOCS, schedLightFile);
		await pageScheduleLight.screenshot({ path: schedLightPathConv, fullPage: false });
		await pageScheduleLight.screenshot({ path: schedLightPathDocs, fullPage: false });
		const schedLightStat = fs.statSync(schedLightPathConv);
		console.log(`Saved ${schedLightFile} (${schedLightStat.size} bytes)`);
		await pageScheduleLight.close();

		// -----------------------------------------------------------------
		// 4. SCHEDULE WAITLIST QUICK FILL & RECOVERY (PC DARK)
		// -----------------------------------------------------------------
		console.log("4. Capturing Schedule Waitlist Quick Fill PC Dark (1440x900)...");
		const pageScheduleDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pageScheduleDark.goto(`${webBaseUrl}/waitlist_quickfill_preview.html?theme=dark`, {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await pageScheduleDark.waitForSelector('[data-testid="waitlist-quickfill-modal"]', { visible: true, timeout: 15000 });
		await pageScheduleDark.waitForTimeout(1000);

		const schedDarkFile = "proof_waitlist_schedule_pc_dark.png";
		const schedDarkPathConv = path.join(OUT_CONV, schedDarkFile);
		const schedDarkPathDocs = path.join(OUT_DOCS, schedDarkFile);
		await pageScheduleDark.screenshot({ path: schedDarkPathConv, fullPage: false });
		await pageScheduleDark.screenshot({ path: schedDarkPathDocs, fullPage: false });
		const schedDarkStat = fs.statSync(schedDarkPathConv);
		console.log(`Saved ${schedDarkFile} (${schedDarkStat.size} bytes)`);
		await pageScheduleDark.close();

		// Проверка размеров
		const minSize = 40000;
		if (lightStat.size < minSize || darkStat.size < minSize || schedLightStat.size < minSize || schedDarkStat.size < minSize) {
			throw new Error(`Screenshots under 40KB minimum: light=${lightStat.size}, dark=${darkStat.size}, schedLight=${schedLightStat.size}, schedDark=${schedDarkStat.size}`);
		}

		console.log("ALL 4 SCREENSHOTS SUCCESSFULLY CAPTURED AND VERIFIED!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
