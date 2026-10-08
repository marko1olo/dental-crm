const { chromium } = require("playwright");

const APP_BASE = "http://127.0.0.1:5173";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unlockIfNecessary(page) {
	try {
		await wait(1000);
		const secretInput = await page.$('input[placeholder*="секрет"]');
		if (secretInput) {
			console.log("   [UNLOCK] Обнаружен ввод секрета администратора. Вводим demo...");
			await secretInput.fill("demo");
			await wait(300);
			const submitBtn = await page.$('button[type="submit"]:has-text("Открыть смену")');
			if (submitBtn) {
				await submitBtn.click();
				await wait(2000);
			}
		}
		const demoUnlockBtn = await page.$('button:has-text("Войти как Доктор Демо"), button:has-text("PIN: 1111")');
		if (demoUnlockBtn) {
			console.log("   [UNLOCK] Нажата кнопка быстрого входа Доктора Демо...");
			await demoUnlockBtn.click();
			await wait(2000);
		}
	} catch (err) {
		console.log("   [UNLOCK] Исключение при разблокировке:", err.message);
	}
}

async function probe() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await context.addCookies([
			{ name: "dente_clinic_token", value: "demo-showcase-clinic-token", domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: "demo-showcase-staff-token-doctor", domain: "127.0.0.1", path: "/" },
		]);

		const page = await context.newPage();
		await page.addInitScript(() => {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_active_staff_user", JSON.stringify({
				id: "demo-doctor-chief",
				fullName: "Доктор Демо (Главный врач)",
				role: "doctor",
				active: true,
				color: "var(--teal, #0d9488)",
			}));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}));
		});

		console.log("Navigating to live app /?demo=true#schedule...");
		await page.goto(`${APP_BASE}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 25000 });
		await unlockIfNecessary(page);
		await wait(2000);

		console.log("Navigating to #lab...");
		await page.evaluate(() => {
			window.location.hash = "#lab";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await wait(2500);

		const labOrdersView = await page.$('[data-testid="dental-lab-orders-view"]');
		console.log("Found dental-lab-orders-view:", Boolean(labOrdersView));

		const tableOrCards = await page.$('[data-testid="lab-orders-dense-table"], [data-testid="lab-orders-cards-grid"]');
		console.log("Found table or cards grid:", Boolean(tableOrCards));

		const scanBtns = await page.$$('[data-testid*="view-scan-btn"]');
		console.log("Found view scan buttons count:", scanBtns.length);

		if (scanBtns.length > 0) {
			const text = await scanBtns[0].innerText();
			console.log("First scan button text:", text);
			await scanBtns[0].click();
			await wait(1500);

			const modal = await page.$('[data-testid="intraoral-scan-3d-viewer-modal"]');
			console.log("Found IntraoralScan3DViewerModal open:", Boolean(modal));
			if (modal) {
				const title = await page.$eval('[data-testid="intraoral-scan-3d-viewer-modal"] h3', (el) => el.innerText).catch(() => "none");
				console.log("Modal title text:", title);
			}
		}
	} finally {
		await browser.close();
	}
}

probe().catch(console.error);
