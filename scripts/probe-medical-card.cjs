const { chromium } = require("playwright");

(async () => {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	page.on("console", (msg) => console.log("LOG:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.log("PAGEERR:", err.message));

	console.log("Navigating...");
	await page.goto("http://127.0.0.1:5173/?demo=true#medical-card", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await page.waitForTimeout(6000);

	const info = await page.evaluate(() => {
		return {
			emrModals: document.querySelectorAll(
				".emr-studio-modal, .emr-studio-window, .emr043-modal-window, [data-testid='badge-emr-draft-status']",
			).length,
			bodyLength: document.body.innerText.length,
			snippet: document.body.innerText.slice(0, 300),
		};
	});
	console.log("INFO:", JSON.stringify(info));
	await browser.close();
})();
