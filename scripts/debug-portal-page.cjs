const puppeteer = require("puppeteer");

async function check() {
	const browser = await puppeteer.launch({
		headless: "new",
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 900 });

	page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

	await page.goto("http://127.0.0.1:5173/#/book/demo-clinic", {
		waitUntil: "domcontentloaded",
		timeout: 15000,
	});

	await new Promise((r) => setTimeout(r, 2000));

	const bodyText = await page.evaluate(() => document.body.innerText);
	const buttons = await page.evaluate(() =>
		Array.from(document.querySelectorAll("button")).map((b) => b.innerText.trim()).filter(Boolean)
	);
	console.log("BODY TEXT PREVIEW:\n", bodyText.slice(0, 400));
	console.log("BUTTONS FOUND:", buttons);

	await browser.close();
}

check().catch(console.error);
