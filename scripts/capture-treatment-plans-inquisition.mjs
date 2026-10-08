import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/treatment_plans_inquisition";
mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));

if (!executablePath) {
	console.error("No valid browser binary found!");
	process.exit(1);
}

const targets = [
	{
		view: "comparator",
		selector: ".plan-comparator-modal",
		contentCheck: () => {
			const el = document.querySelector(".plan-comparator-modal");
			return el && el.getBoundingClientRect().height > 200;
		},
		name: "proof_treatment_plans_comparator",
	},
	{
		view: "roadmap",
		selector: '[data-testid="roadmap-view-container"]',
		contentCheck: () => {
			const el = document.querySelector('[data-testid="roadmap-view-container"]');
			return el && el.getBoundingClientRect().height > 200;
		},
		name: "proof_treatment_plans_roadmap",
	},
	{
		view: "editor",
		selector: '[data-testid="treatment-plan-module"]',
		contentCheck: () => {
			const el = document.querySelector('[data-testid="treatment-plan-module"]');
			return el && el.getBoundingClientRect().height > 200;
		},
		name: "proof_treatment_plans_editor",
	},
];

async function capture() {
	console.log("== Starting Treatment Plans Inquisition Screenshot Capture ==");
	console.log(`Browser executable: ${executablePath}`);

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const target of targets) {
			for (const theme of ["light", "dark"]) {
				const context = await browser.newContext({
					viewport: { width: 1440, height: 900 },
					colorScheme: theme,
				});

				const page = await context.newPage();
				page.on("pageerror", (err) => console.error(`[PAGE ERROR ${target.view} ${theme}]:`, err.message));
				page.on("console", (msg) => {
					if (msg.type() === "error") {
						console.error(`[CONSOLE ERROR ${target.view} ${theme}]:`, msg.text());
					}
				});

				const targetUrl = `${BASE_URL}/treatment_plan_inquisition_preview.html?view=${target.view}&theme=${theme}`;
				console.log(`Navigating to: ${targetUrl}`);

				await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
				await page.waitForSelector(target.selector, { timeout: 15000 });
				await page.waitForFunction(target.contentCheck, { timeout: 10000 });
				// Allow animations, css variables and fonts to stabilize
				await page.waitForTimeout(1200);

				const screenshotFilename = `${target.name}_pc_${theme}_1440x900.png`;
				const screenshotPath = path.join(PROOFS_DIR, screenshotFilename);

				await page.screenshot({
					path: screenshotPath,
					fullPage: false,
				});

				const stats = statSync(screenshotPath);
				console.log(`[SUCCESS] Saved: ${screenshotPath} (Size: ${stats.size} bytes)`);

				if (stats.size < 20000) {
					console.warn(`[WARNING] Screenshot size (${stats.size}b) is suspiciously small!`);
				}

				await context.close();
			}
		}

		// --- Mobile Viewport (390x844) ---
		console.log("Capturing Mobile Viewport (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
			colorScheme: "dark",
		});
		const mobilePage = await mobileContext.newPage();
		const mobileUrl = `${BASE_URL}/treatment_plan_inquisition_preview.html?view=comparator&theme=dark`;
		await mobilePage.goto(mobileUrl, { waitUntil: "networkidle", timeout: 30000 });
		await mobilePage.waitForSelector(".plan-comparator-modal", { timeout: 15000 });
		await mobilePage.waitForTimeout(1500);

		const mobileFilename = "proof_treatment_plans_comparator_mobile_390x844.png";
		const mobilePath = path.join(PROOFS_DIR, mobileFilename);
		await mobilePage.screenshot({ path: mobilePath, fullPage: false });
		const mobileStats = statSync(mobilePath);
		console.log(`[SUCCESS] Saved: ${mobilePath} (Size: ${mobileStats.size} bytes)`);
		await mobileContext.close();
	} finally {
		await browser.close();
	}

	console.log("== Finished all screenshots! ==");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
