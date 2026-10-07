import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\46717f01-8c37-400a-9e8a-e7b9084670c4\\scratch\\screenshots";
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const targets = [
	{
		name: "01_ortho_protocol_pc_light.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=light&view=protocol",
		waitFor: "button",
		delay: 1200,
	},
	{
		name: "02_ortho_protocol_pc_dark.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=dark&view=protocol",
		waitFor: "button",
		delay: 1200,
	},
	{
		name: "03_ceph_analysis_pc_light.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=light&view=ceph",
		waitFor: "button",
		delay: 1500,
	},
	{
		name: "04_ceph_analysis_pc_dark.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=dark&view=ceph",
		waitFor: "button",
		delay: 1500,
	},
	{
		name: "05_ortho_materials_pc_light.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=light&view=materials",
		waitFor: "input",
		delay: 1000,
	},
	{
		name: "06_ortho_materials_pc_dark.png",
		url: "http://127.0.0.1:5173/ortho_protocol_preview.html?theme=dark&view=materials",
		waitFor: "input",
		delay: 1000,
	},
	{
		name: "07_perio_chart_pc_light.png",
		url: "http://127.0.0.1:5173/surgery_cockpit_preview.html?view=perio&theme=light",
		waitFor: "[data-testid='perio-chart-section']",
		delay: 1500,
	},
	{
		name: "08_perio_chart_pc_dark.png",
		url: "http://127.0.0.1:5173/surgery_cockpit_preview.html?view=perio&theme=dark",
		waitFor: "[data-testid='perio-chart-section']",
		delay: 1500,
	},
	{
		name: "09_perio_pocket_modal_pc_light.png",
		url: "http://127.0.0.1:5173/surgery_cockpit_preview.html?view=pocket_modal&theme=light",
		waitFor: "[data-testid='periodontal-pocket-depth-modal']",
		delay: 1200,
	},
	{
		name: "10_perio_pocket_modal_pc_dark.png",
		url: "http://127.0.0.1:5173/surgery_cockpit_preview.html?view=pocket_modal&theme=dark",
		waitFor: "[data-testid='periodontal-pocket-depth-modal']",
		delay: 1200,
	},
];

async function run() {
	console.log("Launching Edge browser via Playwright...");
	const browser = await chromium.launch({
		executablePath: edgePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	const results = [];

	for (const target of targets) {
		console.log(`\nNavigating to: ${target.url}`);
		const page = await context.newPage();
		try {
			const resp = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 20000 });
			const status = resp?.status();
			console.log(`HTTP status: ${status}`);
			if (status !== 200) {
				throw new Error(`Failed to load ${target.url}, status: ${status}`);
			}

			if (target.waitFor) {
				await page.waitForSelector(target.waitFor, { timeout: 10000 });
			}

			if (target.delay) {
				await page.waitForTimeout(target.delay);
			}

			const outPath = path.join(OUT_DIR, target.name);
			await page.screenshot({ path: outPath, fullPage: false });

			const stat = fs.statSync(outPath);
			const buf = fs.readFileSync(outPath);
			const hash = crypto.createHash("md5").update(buf).digest("hex");

			console.log(`Captured: ${target.name} (${stat.size} bytes, MD5: ${hash})`);
			results.push({
				name: target.name,
				path: outPath,
				size: stat.size,
				hash,
				status: stat.size >= 40000 ? "VALID" : "TOO_SMALL",
			});
		} catch (err) {
			console.error(`Error capturing ${target.name}:`, err);
			results.push({
				name: target.name,
				error: err.message,
				status: "ERROR",
			});
		} finally {
			await page.close();
		}
	}

	await browser.close();

	console.log("\n================ SUMMARY ================");
	console.table(results);
}

run().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
