import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, "apps/web/screenshots/chairside_pos");
const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1561388e-15ed-4def-989c-8ca284d5dad8";

if (!fs.existsSync(outDir)) {
	fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(artifactDir)) {
	fs.mkdirSync(artifactDir, { recursive: true });
}

async function capture() {
	console.log("Launching browser for Chairside POS & Roadmap Proof...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	// 1. Chairside POS Modal - PC Light (Tenders View)
	console.log("Capturing 1. Chairside POS PC Light (1440x900)...");
	await page.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=light", { waitUntil: "networkidle" });
	const posBlockLight = await page.waitForSelector('[data-testid="chairside-pos-block"]', { state: "attached", timeout: 10000 });
	await posBlockLight.scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const file1 = path.join(outDir, "chairside_pos_light.png");
	const file1Artifact = path.join(artifactDir, "chairside_pos_light.png");
	await page.screenshot({ path: file1, fullPage: false });
	fs.copyFileSync(file1, file1Artifact);
	console.log("Saved:", file1);

	// 2. Chairside POS Modal - PC Dark (Tenders View)
	console.log("Capturing 2. Chairside POS PC Dark (1440x900)...");
	await page.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=dark", { waitUntil: "networkidle" });
	const posBlockDark = await page.waitForSelector('[data-testid="chairside-pos-block"]', { state: "attached", timeout: 10000 });
	await posBlockDark.scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const file2 = path.join(outDir, "chairside_pos_dark.png");
	const file2Artifact = path.join(artifactDir, "chairside_pos_dark.png");
	await page.screenshot({ path: file2, fullPage: false });
	fs.copyFileSync(file2, file2Artifact);
	console.log("Saved:", file2);

	// 2b. Chairside POS Modal - PC Light (Paid Confirmation View)
	console.log("Capturing 2b. Chairside POS Paid Confirmation PC Light (1440x900)...");
	await page.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=light&paid=true", { waitUntil: "networkidle" });
	const posBlockPaidLight = await page.waitForSelector('[data-testid="chairside-pos-block"]', { state: "attached", timeout: 10000 });
	await posBlockPaidLight.scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const file2b = path.join(outDir, "chairside_pos_paid_light.png");
	const file2bArtifact = path.join(artifactDir, "chairside_pos_paid_light.png");
	await page.screenshot({ path: file2b, fullPage: false });
	fs.copyFileSync(file2b, file2bArtifact);
	console.log("Saved:", file2b);

	// 2c. Chairside POS Modal - PC Dark (Paid Confirmation View)
	console.log("Capturing 2c. Chairside POS Paid Confirmation PC Dark (1440x900)...");
	await page.goto("http://127.0.0.1:5173/chairside_pos_preview.html?theme=dark&paid=true", { waitUntil: "networkidle" });
	const posBlockPaidDark = await page.waitForSelector('[data-testid="chairside-pos-block"]', { state: "attached", timeout: 10000 });
	await posBlockPaidDark.scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const file2c = path.join(outDir, "chairside_pos_paid_dark.png");
	const file2cArtifact = path.join(artifactDir, "chairside_pos_paid_dark.png");
	await page.screenshot({ path: file2c, fullPage: false });
	fs.copyFileSync(file2c, file2cArtifact);
	console.log("Saved:", file2c);

	// 3. Treatment Plan Roadmap - PC Light
	console.log("Capturing 3. Treatment Plan Roadmap PC Light (1440x900)...");
	await page.goto("http://127.0.0.1:5173/treatment_plan_roadmap_preview.html?theme=light", { waitUntil: "networkidle" });
	await page.waitForSelector('[data-testid="treatment-plan-roadmap"]', { timeout: 10000 });
	await page.waitForTimeout(1000);
	const file3 = path.join(outDir, "roadmap_plan_sync_light.png");
	const file3Artifact = path.join(artifactDir, "roadmap_plan_sync_light.png");
	await page.screenshot({ path: file3, fullPage: false });
	fs.copyFileSync(file3, file3Artifact);
	console.log("Saved:", file3);

	// 4. Treatment Plan Roadmap - PC Dark
	console.log("Capturing 4. Treatment Plan Roadmap PC Dark (1440x900)...");
	await page.goto("http://127.0.0.1:5173/treatment_plan_roadmap_preview.html?theme=dark", { waitUntil: "networkidle" });
	await page.waitForSelector('[data-testid="treatment-plan-roadmap"]', { timeout: 10000 });
	await page.waitForTimeout(1000);
	const file4 = path.join(outDir, "roadmap_plan_sync_dark.png");
	const file4Artifact = path.join(artifactDir, "roadmap_plan_sync_dark.png");
	await page.screenshot({ path: file4, fullPage: false });
	fs.copyFileSync(file4, file4Artifact);
	console.log("Saved:", file4);

	await browser.close();
	console.log("All 4 Red Team Proof screenshots captured successfully!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
