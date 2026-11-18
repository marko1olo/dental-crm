const { chromium } = require("playwright");

async function testEmrStudio() {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
	await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 45000 });

	console.log("Waiting for .boot-state to detach...");
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
	console.log("App mounted! Waiting 2s...");
	await page.waitForTimeout(2000);

	console.log("Dispatching dente:open-medical-card event...");
	await page.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
		window.dispatchEvent(new CustomEvent("dente:open-emr"));
	});
	await page.waitForTimeout(1000);

	const emrModal = await page.waitForSelector(".emr-studio-modal", { state: "visible", timeout: 15000 }).catch(() => null);
	console.log("EMR Studio Modal found?", Boolean(emrModal));

	if (emrModal) {
		await page.screenshot({ path: "test_emr_modal.png" });
		console.log("Saved test_emr_modal.png!");
	}

	await browser.close();
}

testEmrStudio().catch(console.error);
