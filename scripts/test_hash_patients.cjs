const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

	await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	console.log("Triggering hash change to #patients via evaluate...");
	await page.evaluate(() => {
		window.location.hash = "#patients";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(3000);

	const url = page.url();
	console.log("Current URL:", url);

	const patientsPanel = await page.locator(".patients-panel").count();
	console.log("Patients panel count:", patientsPanel);

	const patientRows = await page.locator(".patient-row").count();
	console.log("Patient rows count:", patientRows);

	if (patientRows > 0) {
		const names = await page.evaluate(() =>
			Array.from(document.querySelectorAll(".patient-row h3")).map((el) => el.innerText.trim())
		);
		console.log("Patient names in live CRM:", names.slice(0, 5));
	}

	await browser.close();
}

main().catch(console.error);
