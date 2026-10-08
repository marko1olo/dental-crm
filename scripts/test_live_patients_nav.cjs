const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	console.log("Navigating to http://127.0.0.1:5173/?demo=true#patients ...");
	await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);

	console.log("Clicking a[href='#patients']...");
	await page.click('a[href="#patients"]');
	await page.waitForTimeout(2000);

	const rows = await page.locator(".patient-row").count();
	console.log("Patient rows count:", rows);

	const panel = await page.locator(".patients-panel").count();
	console.log("Patients panel count:", panel);

	if (rows > 0) {
		const firstPatient = await page.locator(".patient-row h3").first().innerText();
		console.log("First patient name:", firstPatient);
	}

	await browser.close();
}

main().catch(console.error);
