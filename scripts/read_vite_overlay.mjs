import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function run() {
	const uniqueId = Date.now();
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "ООО Стоматология",
			email: `err-${uniqueId}@dente.ru`,
			password: "Password123!",
			ownerName: "Д-р Смирнов К.П.",
			ownerPin: "1234",
		}),
	});
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});
	const unlockData = await unlockRes.json();

	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

	await context.addInitScript(({ ct, st, uid }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem(
			"dente_staff_session",
			JSON.stringify({
				userId: uid,
				name: "Д-р Смирнов К.П.",
				fullName: "Д-р Смирнов К.П.",
				role: "owner",
				specialties: ["Стоматолог-терапевт"],
			})
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
	}, { ct: initData.clinicToken, st: unlockData.staffToken, uid: initData.ownerUserId });

	const page = await context.newPage();
	await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	const optionsBtn = await page.waitForSelector('[data-testid="finance-toolbar-options-btn"]', { timeout: 10000 });
	await optionsBtn.click();
	await page.waitForTimeout(400);

	const cashboxBtn = await page.waitForSelector('[data-testid="btn-finance-open-cashbox"]', { timeout: 5000 });
	await cashboxBtn.click();
	await page.waitForTimeout(800);

	// Click 5000, 3000, 1000 chips to total 9000 ₽
	const chips = await page.$$('.cashbox-view button:has-text("5 000"), .cashbox-view button:has-text("5000")');
	if (chips.length > 0) {
		await chips[0].click();
		await page.waitForTimeout(200);
	}
	const chip3k = await page.$$('.cashbox-view button:has-text("3 000"), .cashbox-view button:has-text("3000")');
	if (chip3k.length > 0) {
		await chip3k[0].click();
		await page.waitForTimeout(200);
	}
	const chip1k = await page.$$('.cashbox-view button:has-text("1 000"), .cashbox-view button:has-text("1000")');
	if (chip1k.length > 0) {
		await chip1k[0].click();
		await page.waitForTimeout(200);
	}

	const openPaymentBtn = await page.waitForSelector('[data-testid="btn-open-payment-modal"]', { timeout: 8000 }).catch(() => null);
	console.log("Found openPaymentBtn:", Boolean(openPaymentBtn));
	if (openPaymentBtn) {
		await openPaymentBtn.click();
		await page.waitForTimeout(1000);
		const paymentModalStudio = await page.$('[data-testid="payment-modal-studio"]');
		console.log("Found paymentModalStudio:", Boolean(paymentModalStudio));

		const splitTab = await page.waitForSelector('[data-testid="tab-method-split"]', { timeout: 5000 });
		console.log("Found splitTab:", Boolean(splitTab));
		await splitTab.click();
		await page.waitForTimeout(400);

		const cardInput = await page.$('input[data-testid="input-split-card"]');
		console.log("Found cardInput:", Boolean(cardInput));
		if (cardInput) {
			await cardInput.fill("5000");
			await page.waitForTimeout(300);
		}
	}

	const overlayInfo = await page.evaluate(() => {
		const overlay = document.querySelector("vite-error-overlay");
		if (!overlay) return "No vite-error-overlay found";
		const root = overlay.shadowRoot;
		if (!root) return "Overlay has no shadowRoot";
		return root.innerHTML;
	});

	console.log("OVERLAY HTML:\n", overlayInfo.slice(0, 1500));
	await browser.close();
}

run().catch(console.error);
