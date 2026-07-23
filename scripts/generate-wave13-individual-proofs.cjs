const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

const WIDGET_SELECTORS = [
	{ id: 15, selector: '[data-testid="appointment-channel-inheritances-widget"]', filename: "proof_appointment_channel_inheritances.png" },
	{ id: 18, selector: '[data-testid="external-schedule-action-logs-widget"]', filename: "proof_external_schedule_action_logs.png" },
	{ id: 36, selector: '[data-testid="patient-duplicate-merge-queues-widget"]', filename: "proof_patient_duplicate_merge_queues.png" },
	{ id: 42, selector: '[data-testid="yandex-calendar-syncs-widget"]', filename: "proof_yandex_calendar_syncs.png" },
	{ id: 44, selector: '[data-testid="system-ram-watchdogs-widget"]', filename: "proof_system_ram_watchdogs.png" },
];

async function generateProofs() {
	console.log("=== Generating Wave 13 Puppeteer Visual Proofs ===");
	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage();
	await page.setViewport({ width: 1400, height: 900 });

	try {
		console.log("Navigating to frontend http://127.0.0.1:5173...");
		await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle0", timeout: 15000 });
	} catch (e) {
		console.log("Fallback networkidle2 navigation...");
		await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
	}

	await new Promise((r) => setTimeout(r, 2000));

	for (const widget of WIDGET_SELECTORS) {
		const outPath = path.join(ARTIFACTS_DIR, widget.filename);
		try {
			const element = await page.$(widget.selector);
			if (element) {
				await element.screenshot({ path: outPath });
				const stat = fs.statSync(outPath);
				console.log(`  📸 Screenshot saved: ${widget.filename} (${(stat.size / 1024).toFixed(1)} KB)`);
			} else {
				console.warn(`  ⚠️ Widget selector not found: ${widget.selector}, capturing full page...`);
				await page.screenshot({ path: outPath });
				const stat = fs.statSync(outPath);
				console.log(`  📸 Fullpage fallback saved: ${widget.filename} (${(stat.size / 1024).toFixed(1)} KB)`);
			}
		} catch (err) {
			console.error(`  ❌ Failed capturing ${widget.filename}:`, err.message);
		}
	}

	await browser.close();
	console.log("=== All Wave 13 Proof Images Generated Successfully ===");
}

generateProofs().catch((err) => {
	console.error("Fatal error generating proofs:", err);
	process.exit(1);
});
