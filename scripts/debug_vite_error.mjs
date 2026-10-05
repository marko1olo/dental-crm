import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:4100";

async function debugViteError() {
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" })
	});
	const loginData = await loginRes.json();

	const browser = await chromium.launch({
		executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		headless: true
	});

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

	await context.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		localStorage.setItem("dental_workspace_onboarding_completed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_tour_completed", "true");
	}, { clinicToken: loginData.clinicToken, staffToken: loginData.staffToken, user: loginData.user });

	const page = await context.newPage();
	page.on("pageerror", (err) => {
		console.error(">>> PAGE ERROR CAUGHT:", err.message, err.stack);
	});
	page.on("console", (msg) => {
		if (msg.type() === "error") console.error(">>> CONSOLE ERROR:", msg.text());
	});

	await page.goto(`${BASE_URL}/#patients`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	const patientRow = await page.waitForSelector('[data-testid^="patient-row-"]', { timeout: 10000 });
	await patientRow.click();
	await page.waitForTimeout(500);

	const openVisitBtn = await page.waitForSelector('[data-testid="patient-card-open-visit-btn"]', { timeout: 5000 });
	await openVisitBtn.click();
	await page.waitForTimeout(1000);

	const odontogramTab = await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 8000 });
	await odontogramTab.click();
	await page.waitForTimeout(1000);

	console.log("Clicking tooth 16...");
	const tooth16 = await page.$('path[data-tooth="16"], g[data-tooth="16"], [data-tooth-id="16"]');
	if (tooth16) {
		await tooth16.click();
		await page.waitForTimeout(1000);
	}

	console.log("Checking if radial menu is open...");
	const radialClose = await page.$('.radial-close-btn');
	console.log("Radial close btn exists?", !!radialClose);
	if (radialClose) {
		await radialClose.click();
		await page.waitForTimeout(1000);
		console.log("Closed radial menu!");
	}

	// Check for vite-error-overlay
	const viteOverlay = await page.$('vite-error-overlay');
	if (viteOverlay) {
		const overlayText = await page.evaluate(() => {
			const el = document.querySelector('vite-error-overlay');
			return el?.shadowRoot?.innerHTML || el?.innerHTML || 'no text';
		});
		console.log(">>> VITE OVERLAY CONTENT:", overlayText.slice(0, 500));
	} else {
		console.log(">>> NO VITE ERROR OVERLAY! All clean!");
	}

	await browser.close();
}

debugViteError().catch(console.error);
