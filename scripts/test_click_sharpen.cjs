const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();

		page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
		page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

		console.log("Loading page...");
		await page.goto("http://127.0.0.1:5173/cbct_adaptive_inquisition_preview.html?theme=dark", { waitUntil: "networkidle" });

		console.log("Finding button...");
		const info = await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			return btn ? { found: true, text: btn.innerText } : { found: false };
		});
		console.log("Button info before click:", info);

		console.log("Clicking button via evaluate...");
		const clickResult = await page.evaluate(() => {
			try {
				const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
				if (!btn) return "not_found";
				btn.click();
				return "clicked_ok";
			} catch (e) {
				return "error: " + e.message;
			}
		});
		console.log("Click result:", clickResult);

		const infoAfter = await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="cbct-tool-sharpen"]');
			return btn ? { found: true, text: btn.innerText } : { found: false };
		});
		console.log("Button info after click:", infoAfter);
	} finally {
		await browser.close();
	}
}

main().catch((err) => console.error("FATAL:", err));
