const puppeteer = require("puppeteer");

(async () => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	await page.evaluateOnNewDocument(() => {
		localStorage.setItem("dente-patient-token", '"test"');
		localStorage.setItem("dente-patient-phone", '"+1234567890"');
		localStorage.setItem("dente-wizard-completed", "true");
		localStorage.setItem("dente-workspace-role", '"admin"');
	});

	await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });

	// Wait a bit just in case
	await new Promise((r) => setTimeout(r, 2000));

	const elements = await page.evaluate(() => {
		const results = [];
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_ELEMENT,
		);
		while (walker.nextNode()) {
			const el = walker.currentNode;
			if (el.tagName === "DIV" || el.tagName === "BUTTON") {
				const rect = el.getBoundingClientRect();
				const style = window.getComputedStyle(el);

				// Find elements that are at the bottom left
				if (
					rect.left < 50 &&
					rect.bottom > window.innerHeight - 100 &&
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
							position: style.position,
						});
					}
				}
			}
		}
		return results;
	});

	console.log("Stray elements found:", elements);
	await browser.close();
})();
