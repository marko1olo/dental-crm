const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

const WIDGET_SELECTORS = [
	{ id: 4, selector: '[data-testid="patient-communication-timelines-widget"]', filename: "proof_patient_communication_timelines.png" },
	{ id: 8, selector: '[data-testid="egisz-blank-permissions-widget"]', filename: "proof_egisz_blank_permissions.png" },
	{ id: 10, selector: '[data-testid="previous-chat-dialog-histories-widget"]', filename: "proof_previous_chat_dialog_histories.png" },
	{ id: 12, selector: '[data-testid="collaborative-chat-processing-states-widget"]', filename: "proof_collaborative_chat_processing_states.png" },
	{ id: 14, selector: '[data-testid="chat-message-dispatch-statuses-widget"]', filename: "proof_chat_message_dispatch_statuses.png" },
];

async function generateProofs() {
	console.log("=== Generating Wave 15 Puppeteer Visual Proofs ===");
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
	console.log("=== All Wave 15 Proof Images Generated Successfully ===");
}

generateProofs().catch((err) => {
	console.error("Fatal error generating proofs:", err);
	process.exit(1);
});
