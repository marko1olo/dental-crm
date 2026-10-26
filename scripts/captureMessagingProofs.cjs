const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
	const outDir = path.resolve(__dirname, '..', 'docs', 'proofs', 'messaging');
	fs.mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	});

	try {
		// --- 1. PC CONTEXT (1440x900) ---
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: 'light',
			serviceWorkers: 'block',
		});

		const pcPage = await pcContext.newPage();

		await pcPage.addInitScript(() => {
			localStorage.setItem('dente_clinic_token', 'test-clinic-token-abc123');
			localStorage.setItem('dente_staff_token', 'test-staff-token-xyz789');
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true }));
			localStorage.setItem('dente_demo_showcase', 'true');
		});

		await pcPage.route('**/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, data: [] }),
			});
		});

		const baseUrl = 'http://127.0.0.1:5174/?omnichannel_hub=1';
		console.log(`Navigating PC page to ${baseUrl} ...`);
		try {
			await pcPage.goto(baseUrl, { timeout: 20000 });
		} catch (e) {}

		await pcPage.waitForSelector('.omnichannel-modal-container', { timeout: 20000 });
		await pcPage.waitForTimeout(800);

		// 1. PC Light (1440x900)
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'light');
			document.body.setAttribute('data-theme', 'light');
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('light');
			document.body.classList.remove('dark');
			document.body.classList.add('light');
		});
		await pcPage.waitForTimeout(400);

		const p1 = path.join(outDir, '01_omnichannel_pc_light.png');
		await pcPage.screenshot({ path: p1, fullPage: false });
		console.log('Saved:', p1);

		// 2. PC Dark (1440x900)
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.body.setAttribute('data-theme', 'dark');
			document.documentElement.classList.remove('light');
			document.documentElement.classList.add('dark');
			document.body.classList.remove('light');
			document.body.classList.add('dark');
		});
		await pcPage.waitForTimeout(400);

		const p2 = path.join(outDir, '02_omnichannel_pc_dark.png');
		await pcPage.screenshot({ path: p2, fullPage: false });
		console.log('Saved:', p2);

		await pcContext.close();

		// --- 2. MOBILE CONTEXT (390x844) ---
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			colorScheme: 'light',
			serviceWorkers: 'block',
		});

		const mobilePage = await mobileContext.newPage();

		await mobilePage.addInitScript(() => {
			localStorage.setItem('dente_clinic_token', 'test-clinic-token-abc123');
			localStorage.setItem('dente_staff_token', 'test-staff-token-xyz789');
			localStorage.setItem('dental-crm:onboarding:v1', JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
			localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true }));
			localStorage.setItem('dente_demo_showcase', 'true');
		});

		await mobilePage.route('**/api/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, data: [] }),
			});
		});

		const mobileUrl = 'http://127.0.0.1:5174/?omnichannel_hub=1';
		console.log(`Navigating Mobile page to ${mobileUrl} ...`);
		try {
			await mobilePage.goto(mobileUrl, { timeout: 20000 });
		} catch (e) {}

		await mobilePage.waitForSelector('.omnichannel-modal-container', { timeout: 20000 });
		await mobilePage.waitForTimeout(800);

		// 3. Mobile Light (390x844)
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'light');
			document.body.setAttribute('data-theme', 'light');
			document.documentElement.classList.remove('dark');
			document.documentElement.classList.add('light');
			document.body.classList.remove('dark');
			document.body.classList.add('light');
		});
		await mobilePage.waitForTimeout(400);

		const p3 = path.join(outDir, '03_omnichannel_mobile_light.png');
		await mobilePage.screenshot({ path: p3, fullPage: false });
		console.log('Saved:', p3);

		// 4. Mobile Dark (390x844)
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute('data-theme', 'dark');
			document.body.setAttribute('data-theme', 'dark');
			document.documentElement.classList.remove('light');
			document.documentElement.classList.add('dark');
			document.body.classList.remove('light');
			document.body.classList.add('dark');
		});
		await mobilePage.waitForTimeout(400);

		const p4 = path.join(outDir, '04_omnichannel_mobile_dark.png');
		await mobilePage.screenshot({ path: p4, fullPage: false });
		console.log('Saved:', p4);

		await mobileContext.close();
		console.log('All 4 proofs successfully captured!');
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Capture failed:', err);
	process.exit(1);
});
