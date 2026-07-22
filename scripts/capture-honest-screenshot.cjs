const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
	console.log("Starting single honest screenshot capture from http://localhost:5173...");

	const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\0467f1f5-b670-4f33-a24a-6bebdef869e6";
	const filename = "proof_honest_main_screen.png";
	const targetPath = path.join(artifactsDir, filename);

	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1440, height: 900 });

		console.log("Navigating to http://localhost:5173...");
		const response = await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });
		console.log(`HTTP Response Status: ${response.status()}`);

		await wait(1500);

		await page.screenshot({ path: targetPath, fullPage: false });

		const content = fs.readFileSync(targetPath);
		const hash = crypto.createHash("md5").update(content).digest("hex");

		console.log("\n=========================================");
		console.log("SINGLE HONEST SCREENSHOT VERIFICATION");
		console.log("=========================================");
		console.log(`Path: ${targetPath}`);
		console.log(`File Size: ${content.length} bytes`);
		console.log(`MD5 Hash: ${hash}`);
		console.log("=========================================");

	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
