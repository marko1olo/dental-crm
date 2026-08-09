const { chromium } = require("playwright");
(async () => {
	const b = await chromium.launch({ headless: true });
	const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
	const p = await ctx.newPage();
	await p.route("**/api/imaging/**", (r) =>
		r.fulfill({ status: 200, body: '{"items":[],"bundles":[],"ok":true}' }),
	);
	await p.goto("http://127.0.0.1:5173");
	await p.fill('input[type="email"]', "admin");
	await p.fill('input[type="password"]', "admin");
	await p.click('button:has-text("Войти")');
	await p.waitForLoadState("networkidle");
	try {
		const staffBtn = p
			.locator(
				'button:has-text("Доктор"), button:has-text("Сисадмин"), button:has-text("Иванов")',
			)
			.first();
		if (await staffBtn.isVisible({ timeout: 2000 })) await staffBtn.click();
	} catch (e) {}
	const pin = p.locator('input[type="password"], input[type="tel"]').first();
	if (await pin.isVisible()) {
		await pin.fill("1234");
		await p.keyboard.press("Enter");
		await p.waitForTimeout(1000);
	} else {
		await p.keyboard.type("1234");
		await p.waitForTimeout(1000);
	}
	await p.waitForLoadState("networkidle");
	try {
		const ob = p.locator('text="Сначала осмотреться"');
		if (await ob.isVisible({ timeout: 2000 })) await ob.click();
	} catch (e) {}
	await p.click('text="Пациенты"');
	await p.waitForTimeout(2000);
	console.log("BODY TEXT:");
	console.log(await p.evaluate(() => document.body.innerText));
	console.log("SIDEBAR HTML:");
	console.log(
		await p.evaluate(() => {
			const sb = document.querySelector("nav, aside");
			return sb ? sb.innerHTML : "No sidebar found";
		}),
	);
	console.log(await p.evaluate(() => document.body.innerText));
	await b.close();
})();
