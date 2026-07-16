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
				el.textContent &&
				(el.textContent.includes("[ ]") || el.textContent.includes("[]"))
			) {
				results.push({
					tag: el.tagName,
					className: el.className,
					id: el.id,
					text: el.textContent.trim().substring(0, 50),
				});
			}
		}
		return results;
	});

	console.log("Elements with brackets:", elements);
	await browser.close();
})();
