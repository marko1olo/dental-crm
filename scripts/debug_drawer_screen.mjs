import puppeteer from "puppeteer";
import fs from "node:fs";

async function main() {
	const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});
	const page = await browser.newPage();
	page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
	page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
	await page.setViewport({ width: 1440, height: 900 });
	console.log("Navigating to drawer dark...");
	await page.goto(
		"http://127.0.0.1:5173/patients_inquisition_preview.html?view=drawer&theme=dark",
		{ waitUntil: "domcontentloaded" },
	);
	console.log("Waiting for selector...");
	await page.waitForSelector('[data-testid="patient-drawer"]', { timeout: 10000 });
	await new Promise((r) => setTimeout(r, 2000));
	const out = "docs/screenshots/patients_inquisition/03_patient_drawer_pc_dark.png";
	await page.screenshot({ path: out });
	console.log(`Saved ${out}, size: ${fs.statSync(out).size} bytes`);
	await browser.close();
}

main().catch(console.error);
