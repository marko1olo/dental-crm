import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0c34a362-565b-437a-98c5-bee766bb67ef";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\telephony";

fs.mkdirSync(BRAIN_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
	console.log("Launching Puppeteer for Telephony Red Team visual proof...");

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => fs.existsSync(p));
	if (!executablePath) {
		throw new Error("No suitable browser executable found");
	}

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		const baseUrl = "http://127.0.0.1:5173";
		console.log(`Connecting to preview server at ${baseUrl}...`);

		const page = await browser.newPage();
		await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

		const targets = [
			{
				name: "telephony_incoming_popup_light.png",
				url: `${baseUrl}/telephony_inquisition_preview.html?view=popup&theme=light`,
				action: async () => {
					await page.waitForSelector('[data-testid="incoming-call-capsule"]', { timeout: 15000 });
					await wait(500);
					const expandBtn = await page.$('[data-testid="capsule-expand-btn"]');
					if (expandBtn) {
						await expandBtn.click();
						await page.waitForSelector('[data-testid="incoming-call-popup"]', { timeout: 10000 });
					}
					await wait(800);
				},
			},
			{
				name: "telephony_incoming_popup_dark.png",
				url: `${baseUrl}/telephony_inquisition_preview.html?view=popup&theme=dark`,
				action: async () => {
					await page.waitForSelector('[data-testid="incoming-call-capsule"]', { timeout: 15000 });
					await wait(500);
					const expandBtn = await page.$('[data-testid="capsule-expand-btn"]');
					if (expandBtn) {
						await expandBtn.click();
						await page.waitForSelector('[data-testid="incoming-call-popup"]', { timeout: 10000 });
					}
					await wait(800);
				},
			},
			{
				name: "telephony_drawer_pc_light.png",
				url: `${baseUrl}/telephony_inquisition_preview.html?view=drawer&theme=light`,
				action: async () => {
					await page.waitForSelector('[data-testid="telephony-patient-side-drawer"]', { timeout: 15000 });
					await wait(800);
				},
			},
			{
				name: "telephony_drawer_pc_dark.png",
				url: `${baseUrl}/telephony_inquisition_preview.html?view=drawer&theme=dark`,
				action: async () => {
					await page.waitForSelector('[data-testid="telephony-patient-side-drawer"]', { timeout: 15000 });
					await wait(800);
				},
			},
		];

		for (const target of targets) {
			console.log(`\nNavigating to ${target.name} (${target.url})...`);
			await page.goto(target.url, { waitUntil: "networkidle0", timeout: 30000 });
			await target.action();

			const docsPath = path.join(DOCS_DIR, target.name);
			const brainPath = path.join(BRAIN_DIR, target.name);

			await page.screenshot({ path: docsPath, fullPage: false });
			fs.copyFileSync(docsPath, brainPath);

			const buf = fs.readFileSync(docsPath);
			const md5 = crypto.createHash("md5").update(buf).digest("hex");
			console.log(`[CAPTURED] ${target.name}: ${docsPath} (${buf.length} bytes, MD5: ${md5})`);
		}

		console.log("\nALL 4 TELEPHONY SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
