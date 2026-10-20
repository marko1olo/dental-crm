import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/1ff62082-0842-4b02-b270-c201aa79be9f";
const PROOFS_DIR = path.resolve("docs/proofs/treatment_plans");

fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function run() {
	console.log("Launching browser...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	// Setup local storage tokens before navigation
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_last_view", "pipeline");
	});

	console.log("Navigating to Treatment Pipeline...");
	await page.goto("http://127.0.0.1:5173/?demo=true#pipeline", { waitUntil: "domcontentloaded", timeout: 30000 });

	// Wait for pipeline cards to appear
	console.log("Waiting for pipeline cards...");
	const openBtnSelector = '[data-testid="pipeline-card-open-plan-btn"]:visible';
	const firstBtn = page.locator(openBtnSelector).first();
	await firstBtn.waitFor({ state: "visible", timeout: 15000 });
	await page.waitForTimeout(1000);

	// Light mode pipeline screenshot
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	});
	await page.waitForTimeout(500);

	const p1Light = path.join(PROOFS_DIR, "pipeline_card_open_editor_pc_light.png");
	await page.screenshot({ path: p1Light });
	console.log(`Saved: ${p1Light} (${fs.statSync(p1Light).size} bytes)`);

	// Dark mode pipeline screenshot
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
	});
	await page.waitForTimeout(500);

	const p1Dark = path.join(PROOFS_DIR, "pipeline_card_open_editor_pc_dark.png");
	await page.screenshot({ path: p1Dark });
	console.log(`Saved: ${p1Dark} (${fs.statSync(p1Dark).size} bytes)`);

	// Switch back to light mode and click "Открыть смету"
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	});
	await page.waitForTimeout(500);

	console.log("Clicking 'Открыть смету' on first card...");
	await firstBtn.click();

	// Wait for Presenter Modal to open
	console.log("Waiting for TreatmentPlanPresenterModal...");
	await page.waitForSelector('[data-testid="treatment-plan-presenter-modal"]', { timeout: 15000 });
	await page.waitForTimeout(1500);

	const p2Light = path.join(PROOFS_DIR, "treatment_plan_real_patient_presenter_pc_light.png");
	await page.screenshot({ path: p2Light });
	console.log(`Saved: ${p2Light} (${fs.statSync(p2Light).size} bytes)`);

	// Dark mode presenter screenshot
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
	});
	await page.waitForTimeout(500);

	const p2Dark = path.join(PROOFS_DIR, "treatment_plan_real_patient_presenter_pc_dark.png");
	await page.screenshot({ path: p2Dark });
	console.log(`Saved: ${p2Dark} (${fs.statSync(p2Dark).size} bytes)`);

	// Copy all screenshots to artifact directory for user review
	const files = [
		"pipeline_card_open_editor_pc_light.png",
		"pipeline_card_open_editor_pc_dark.png",
		"treatment_plan_real_patient_presenter_pc_light.png",
		"treatment_plan_real_patient_presenter_pc_dark.png",
	];

	for (const f of files) {
		const src = path.join(PROOFS_DIR, f);
		const dst = path.join(ARTIFACT_DIR, f);
		fs.copyFileSync(src, dst);
		console.log(`Copied ${f} to artifact directory (${fs.statSync(dst).size} bytes)`);
	}

	await browser.close();
	console.log("Screenshot proof collection complete!");
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
