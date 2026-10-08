const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.evaluate(() => {
		window.location.hash = "#patients";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await page.waitForTimeout(3000);

	const panelText = await page.evaluate(() => {
		const panel = document.querySelector(".patients-panel");
		return panel ? panel.innerText : "NO PANEL FOUND";
	});

	console.log("PATIENTS PANEL INNER TEXT:\n", panelText);
	await browser.close();
}

main().catch(console.error);
