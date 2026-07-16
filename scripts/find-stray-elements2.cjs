const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	await page.evaluateOnNewDocument(() => {
		localStorage.setItem("dente_clinic_token", '"test_token"');
		localStorage.setItem("dente-wizard-completed", '"true"');
		localStorage.setItem("dente-workspace-role", '"admin"');
	});

	await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });

	await new Promise((r) => setTimeout(r, 2000));

	const elements = await page.evaluate(() => {
		const results = [];
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_ELEMENT,
		);
		while (walker.nextNode()) {
			const el = walker.currentNode;
			if (
				el.tagName === "DIV" ||
				el.tagName === "BUTTON" ||
				el.tagName === "SPAN"
			) {
				const rect = el.getBoundingClientRect();

				// Find empty elements that are visible and positioned at the bottom-left area of the screen
				if (
					rect.left < 100 &&
					rect.bottom > window.innerHeight - 150 &&
					rect.width > 0 &&
					rect.height > 0
				) {
					if (!el.textContent.trim() && el.children.length === 0) {
						results.push({
							tag: el.tagName,
							className: el.className,
							id: el.id,
							rect: {
								left: rect.left,
								bottom: rect.bottom,
								width: rect.width,
								height: rect.height,
							},
						});
					}
				}
			}
		}
		return results;
	});

	console.log("Stray elements found at bottom-left:", elements);

	const html = await page.content();
	fs.writeFileSync("dom_dump2.html", html);

	await browser.close();
})();
