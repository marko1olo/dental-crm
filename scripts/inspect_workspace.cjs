const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

	await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	const workspaceHtml = await page.evaluate(() => {
		const ws = document.getElementById("workspace-content");
		return ws ? ws.innerHTML.slice(0, 1500) : "NO WORKSPACE FOUND";
	});

	console.log("WORKSPACE INNER HTML (preview):\n", workspaceHtml);
	await browser.close();
}

main().catch(console.error);
