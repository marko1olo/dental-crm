import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CONV_ID = "462e1e8d-2fdc-4662-804a-ba5db4d6c890";
const PARENT_CONV_ID = "c44dee1f-e8b2-4479-94c5-7299ac52d786";

const DIRS = [
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
	`C:/Users/Admin/.gemini/antigravity/brain/${PARENT_CONV_ID}`,
	"C:/Clinic_MVP/dental-crm/docs/proofs/schedule",
];

for (const d of DIRS) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function saveProofFile(name, buffer) {
	const md5 = crypto.createHash("md5").update(buffer).digest("hex");
	const kb = (buffer.length / 1024).toFixed(1);

	if (buffer.length < 20480) {
		throw new Error(`[BYTE-GUARD FAILED] ${name} is ${kb} KB (< 20 KB floor). Suspicion of blank screen!`);
	}

	for (const dir of DIRS) {
		const targetPath = path.join(dir, name);
		fs.writeFileSync(targetPath, buffer);
	}

	console.log(`[PROOF VERIFIED & SAVED] ${name} (${kb} KB) | MD5: ${md5}`);
	return { filename: name, sizeKb: Number(kb), md5 };
}

async function capture() {
	console.log("=== INQUISITOR SCHEDULE & MOBILE AGENDA 4-STATE VISUAL PROOF ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const manifest = [];

	try {
		// ==================== 1 & 2: PC DESKTOP (1440x900) ====================
		console.log("\n[PC Desktop] Launching 1440x900 viewport...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const pcPage = await pcContext.newPage();
		console.log("[PC Desktop] Navigating to http://127.0.0.1:5173/?demo=true#schedule...");
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#schedule", {
			waitUntil: "domcontentloaded",
		});

		console.log("[PC Desktop] Waiting for schedule view hydration...");
		await pcPage.waitForSelector('[data-testid="schedule-view"], #schedule, .schedule-filter-strip', {
			timeout: 30000,
		});
		await pcPage.waitForTimeout(4000);

		// State 1: PC Light
		console.log("Capturing 1/4: schedule_pc_light_1440x900.png...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await pcPage.waitForTimeout(600);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		manifest.push(await saveProofFile("schedule_pc_light_1440x900.png", pcLightBuf));

		// State 2: PC Dark
		console.log("Capturing 2/4: schedule_pc_dark_1440x900.png...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await pcPage.waitForTimeout(600);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		manifest.push(await saveProofFile("schedule_pc_dark_1440x900.png", pcDarkBuf));

		await pcContext.close();

		// ==================== 3 & 4: MOBILE (390x844 - Apple iOS) ====================
		console.log("\n[Mobile iPhone] Launching 390x844 viewport...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const mobilePage = await mobileContext.newPage();
		console.log("[Mobile iPhone] Navigating to http://127.0.0.1:5173/?demo=true#schedule...");
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#schedule", {
			waitUntil: "domcontentloaded",
		});

		console.log("[Mobile iPhone] Waiting for mobile agenda view hydration...");
		await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda', {
			timeout: 30000,
		});
		await mobilePage.waitForTimeout(4000);

		// State 3: Mobile Light
		console.log("Capturing 3/4: schedule_mobile_light_390x844.png...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await mobilePage.waitForTimeout(600);
		const mobLightBuf = await mobilePage.screenshot({ fullPage: false });
		manifest.push(await saveProofFile("schedule_mobile_light_390x844.png", mobLightBuf));

		// State 4: Mobile Dark
		console.log("Capturing 4/4: schedule_mobile_dark_390x844.png...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await mobilePage.waitForTimeout(600);
		const mobDarkBuf = await mobilePage.screenshot({ fullPage: false });
		manifest.push(await saveProofFile("schedule_mobile_dark_390x844.png", mobDarkBuf));

		await mobileContext.close();

		console.log("\n=======================================================");
		console.log("ALL 4 VISUAL PROOFS SUCCESSFULLY CAPTURED & SAVED!");
		console.log("=======================================================");
		console.log(JSON.stringify(manifest, null, 2));
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
