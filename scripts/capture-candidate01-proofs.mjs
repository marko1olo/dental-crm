import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

async function main() {
	const outDir = path.resolve(process.cwd(), "docs/proofs/odontogram");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 900 });

	const filePath = `file:///${path.resolve(process.cwd(), "tournament_arena.html").replace(/\\/g, "/")}`;
	console.log("Navigating to:", filePath);
	await page.goto(filePath, { waitUntil: "networkidle0" });

	// Filter to candidate #1 (apple-glass)
	await page.evaluate(() => {
		// Click on candidate #1 filter chip
		const chips = Array.from(document.querySelectorAll(".filter-chip"));
		const c1Chip = chips.find(c => c.textContent.includes("apple-glass"));
		if (c1Chip) c1Chip.click();
	});

	await new Promise(r => setTimeout(r, 500));

	// Capture Dark Mode
	const darkProof = path.join(outDir, "candidate01_apple_hig_dark.png");
	const card = await page.$("#card-apple-glass");
	if (card) {
		await card.screenshot({ path: darkProof });
		console.log("Saved dark proof to:", darkProof);
	}

	// Toggle to Light Mode
	await page.evaluate(() => {
		const btn = document.getElementById("themeToggleBtn");
		if (btn) btn.click();
	});

	await new Promise(r => setTimeout(r, 500));

	// Capture Light Mode
	const lightProof = path.join(outDir, "candidate01_apple_hig_light.png");
	if (card) {
		await card.screenshot({ path: lightProof });
		console.log("Saved light proof to:", lightProof);
	}

	await browser.close();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
