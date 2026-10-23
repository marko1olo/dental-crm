import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const EMK_PROOFS_DIR = path.join(process.cwd(), "docs/proofs/emk");
const PATIENT_PROOFS_DIR = path.join(process.cwd(), "docs/proofs/patient");

for (const dir of [EMK_PROOFS_DIR, PATIENT_PROOFS_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveAndVerifyShot(page, destDir, fileName) {
	const proofPath = path.join(destDir, fileName);
	await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
	const size = fs.statSync(proofPath).size;
	if (size < 20480) {
		throw new Error(`[BYTE-GUARD FAILED]: ${fileName} size is ${size} bytes (<20KB)`);
	}
	console.log(`[PROOF VERIFIED]: ${fileName} (${(size / 1024).toFixed(1)} KB)`);
}

async function capture() {
	console.log("=== CAPTURING 4-STATE VISUAL PROOFS FOR EMK & PATIENT ANAMNESIS ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// --- 1. EMK STANDALONE ---
		const emkStates = [
			{ name: "01_emk_diary_pc_light.png", width: 1440, height: 900, theme: "light", isMobile: false },
			{ name: "02_emk_diary_pc_dark.png", width: 1440, height: 900, theme: "dark", isMobile: false },
			{ name: "03_emk_diary_mobile_light.png", width: 390, height: 844, theme: "light", isMobile: true },
			{ name: "04_emk_diary_mobile_dark.png", width: 390, height: 844, theme: "dark", isMobile: true },
		];

		for (const state of emkStates) {
			console.log(`Capturing EMK: ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
			const contextOpts = { viewport: { width: state.width, height: state.height } };
			if (state.isMobile) Object.assign(contextOpts, devices["iPhone 13"]);
			const ctx = await browser.newContext(contextOpts);
			const page = await ctx.newPage();

			await page.goto(`http://127.0.0.1:5173/emk-preview.html?theme=${state.theme}`, {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForSelector('[data-testid="emk-standalone-workspace"]', { timeout: 20000 });
			await sleep(1000);
			await saveAndVerifyShot(page, EMK_PROOFS_DIR, state.name);
			await ctx.close();
		}

		// --- 2. PATIENT ANAMNESIS STANDALONE ---
		const anamnesisStates = [
			{ name: "01_anamnesis_pc_light.png", width: 1440, height: 900, theme: "light", isMobile: false },
			{ name: "02_anamnesis_pc_dark.png", width: 1440, height: 900, theme: "dark", isMobile: false },
			{ name: "03_anamnesis_mobile_light.png", width: 390, height: 844, theme: "light", isMobile: true },
			{ name: "04_anamnesis_mobile_dark.png", width: 390, height: 844, theme: "dark", isMobile: true },
		];

		for (const state of anamnesisStates) {
			console.log(`Capturing Anamnesis: ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
			const contextOpts = { viewport: { width: state.width, height: state.height } };
			if (state.isMobile) Object.assign(contextOpts, devices["iPhone 13"]);
			const ctx = await browser.newContext(contextOpts);
			const page = await ctx.newPage();

			await page.goto(`http://127.0.0.1:5173/anamnesis-preview.html?theme=${state.theme}`, {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForSelector('[data-testid="anamnesis-standalone-workspace"]', { timeout: 20000 });
			await sleep(1000);
			await saveAndVerifyShot(page, PATIENT_PROOFS_DIR, state.name);
			await ctx.close();
		}

		console.log("\n=======================================================");
		console.log(">>> ALL 8 RED TEAM VISUAL PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
