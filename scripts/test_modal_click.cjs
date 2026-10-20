const { chromium } = require("playwright");

(async () => {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token:doctor");
		localStorage.setItem("dente_demo_mode", "true");
	});
	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/?demo=true#inventory", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);
	await page.click('[data-testid="tab-inventory-rules"]');
	await page.waitForTimeout(1000);
	console.log("Locating primary add button...");
	const addBtn = page.locator(".material-boms-header-actions button.material-boms-btn-primary");
	console.log("Primary add button count:", await addBtn.count());
	await addBtn.first().click();
	await page.waitForTimeout(800);
	const hasModal = await page.locator(".material-boms-modal").count();
	console.log("Modal count after click:", hasModal);
	await browser.close();
})();
