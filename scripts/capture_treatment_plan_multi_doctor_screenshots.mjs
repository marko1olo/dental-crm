import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\5ac6b9e9-ee3c-4605-b114-7fce939f0d46";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\screenshots";

fs.mkdirSync(CONV_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture() {
	console.log("Launching Puppeteer for Treatment Plan Multi-Doctor Consortium visual proof...");

	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => fs.existsSync(p));

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		let baseUrl = "http://127.0.0.1:5174";
	for (const port of [5174, 5173]) {
		try {
			const r = await fetch(`http://127.0.0.1:${port}/`);
			if (r.ok) {
				baseUrl = `http://127.0.0.1:${port}`;
				break;
			}
		} catch {}
	}
	console.log(`Using Vite dev server at ${baseUrl}`);

	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

	// 1. PC Light Capture (1440x900)
	console.log("Navigating to Treatment Plan Stages (PC Light)...");
	const urlLight = `${baseUrl}/treatment_plan_preview.html?tab=stages&theme=light`;
		const respLight = await page.goto(urlLight, { waitUntil: "networkidle0", timeout: 30000 });
		console.log(`HTTP Light status: ${respLight?.status()}`);

		await page.waitForSelector('[data-testid="tp-stages-container"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="stage-1-doctor-badge"]', { timeout: 10000 });
		await wait(1200);

		const filenameLight = "proof_treatment_plan_multi_doctor_pc_light.png";
		const pathLightConv = path.join(CONV_DIR, filenameLight);
		const pathLightDocs = path.join(DOCS_DIR, filenameLight);

		await page.screenshot({ path: pathLightConv, fullPage: false });
		fs.copyFileSync(pathLightConv, pathLightDocs);

		const bufLight = fs.readFileSync(pathLightConv);
		const md5Light = crypto.createHash("md5").update(bufLight).digest("hex");
		console.log(`[SAVED] PC Light: ${pathLightConv} (${bufLight.length} bytes, MD5: ${md5Light})`);

		// 2. PC Dark Capture (1440x900)
		console.log("Navigating to Treatment Plan Stages (PC Dark)...");
		const urlDark = `${baseUrl}/treatment_plan_preview.html?tab=stages&theme=dark`;
		const respDark = await page.goto(urlDark, { waitUntil: "networkidle0", timeout: 30000 });
		console.log(`HTTP Dark status: ${respDark?.status()}`);

		await page.waitForSelector('[data-testid="tp-stages-container"]', { timeout: 10000 });
		await page.waitForSelector('[data-testid="stage-1-doctor-badge"]', { timeout: 10000 });
		await wait(1200);

		const filenameDark = "proof_treatment_plan_multi_doctor_pc_dark.png";
		const pathDarkConv = path.join(CONV_DIR, filenameDark);
		const pathDarkDocs = path.join(DOCS_DIR, filenameDark);

		await page.screenshot({ path: pathDarkConv, fullPage: false });
		fs.copyFileSync(pathDarkConv, pathDarkDocs);

		const bufDark = fs.readFileSync(pathDarkConv);
		const md5Dark = crypto.createHash("md5").update(bufDark).digest("hex");
		console.log(`[SAVED] PC Dark: ${pathDarkConv} (${bufDark.length} bytes, MD5: ${md5Dark})`);

		console.log("\n==========================================");
		console.log("SCREENSHOT RED TEAM VERIFICATION COMPLETE");
		console.log("==========================================");
		console.log(`1. Light: ${pathLightConv} | Size: ${bufLight.length} bytes | MD5: ${md5Light}`);
		console.log(`2. Dark:  ${pathDarkConv} | Size: ${bufDark.length} bytes | MD5: ${md5Dark}`);
		console.log("Unique hashes:", md5Light !== md5Dark ? "YES (Strictly Unique)" : "NO (Duplicate!)");
		console.log("==========================================");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Screenshot error:", err);
	process.exit(1);
});
