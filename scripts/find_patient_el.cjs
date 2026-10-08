const { chromium } = require("playwright");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	const info = await page.evaluate(() => {
		const matches = [];
		const all = document.querySelectorAll("*");
		for (const el of all) {
			if (el.children.length === 0 && el.innerText && el.innerText.includes("Пациенты")) {
				matches.push({
					tagName: el.tagName,
					className: el.className,
					innerText: el.innerText,
					parentTag: el.parentElement?.tagName,
					parentClass: el.parentElement?.className,
					grandParentTag: el.parentElement?.parentElement?.tagName,
					grandParentClass: el.parentElement?.parentElement?.className,
				});
			}
		}
		return matches;
	});

	console.log("PATIENT ELEMENTS:", JSON.stringify(info, null, 2));
	await browser.close();
}

main().catch(console.error);
