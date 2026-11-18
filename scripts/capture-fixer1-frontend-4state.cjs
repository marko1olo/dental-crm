const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/frontend_state");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function waitForRealUI(page) {
	await page.waitForSelector('.boot-state, text="Загрузка системы..."', {
		state: "detached",
		timeout: 10000,
	}).catch(() => {});

	const loginBtn = page.locator('button:has-text("Войти в систему"), button:has-text("Демо-вход"), button:has-text("Войти")').first();
	if (await loginBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
		await loginBtn.click();
		await page.waitForTimeout(1000);
	}

	const demoBtn = page.locator(".auth-demo-btn").first();
	if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
		await demoBtn.click();
		await page.waitForTimeout(800);
		const launchBtn = page.locator("button.auth-submit-btn, button:has-text('Начать работу')").first();
		if (await launchBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
			await launchBtn.click();
			await page.waitForTimeout(1500);
		}
	}
}

async function capture() {
	console.log("Launching Chromium for 4-State Proofs on port 5174...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{ name: "01_odontogram_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", hash: "#/visit" },
		{ name: "02_odontogram_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", hash: "#/visit" },
		{ name: "03_omnibar_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", hash: "#/schedule", openOmnibar: true },
		{ name: "04_omnibar_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", hash: "#/schedule", openOmnibar: true },
		{ name: "05_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light", hash: "#/schedule" },
		{ name: "06_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark", hash: "#/schedule" },
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		try {
			await context.addCookies([
				{ name: "dente_clinic_token", value: "demo-showcase-token", domain: "127.0.0.1", path: "/" },
				{ name: "dente_staff_token", value: "demo-showcase-token", domain: "127.0.0.1", path: "/" },
				{ name: "dente_unlocked", value: "true", domain: "127.0.0.1", path: "/" },
			]);
		} catch (_) {}

		await context.setExtraHTTPHeaders({
			"x-dente-clinic-token": "demo-showcase-token",
			"x-dente-staff-token": "demo-showcase-token",
		});

		await context.addInitScript(
			({ t, role }) => {
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_clinic_token", "demo-showcase-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-token");
				localStorage.setItem("dente_active_role", role);
				localStorage.setItem("dente_user_role", role);
				localStorage.setItem("dente_workspace_perspective", role);
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("demo_mode", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem(
					"dente_staff_session",
					JSON.stringify({
						userId: "usr-doctor-01",
						name: "Д-р Воронов А. В.",
						role: role,
						roleScope: "clinical_director",
					}),
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						themeMode: t,
						soundNotificationsMuted: true,
						onboardingDismissed: true,
					}),
				);
				if (t === "dark") {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
			},
			{ t: cfg.theme, role: "doctor" },
		);

		const page = await context.newPage();
		try {
			await page.goto(`http://127.0.0.1:5173/?demo=true${cfg.hash}`, {
				waitUntil: "commit",
				timeout: 20000,
			});
			await page.waitForTimeout(2000);
			await waitForRealUI(page);
			await page.waitForTimeout(2000);

			if (cfg.openOmnibar) {
				await page.keyboard.press("Control+k");
				await page.waitForTimeout(800);
			}

			const outPath = path.join(PROOFS_DIR, cfg.name);
			await page.screenshot({ path: outPath, fullPage: false });
			const stats = fs.statSync(outPath);
			console.log(`Saved ${cfg.name} (${stats.size} bytes)`);
		} catch (err) {
			console.error(`Failed ${cfg.name}:`, err.message);
		} finally {
			await context.close();
		}
	}

	await browser.close();
	console.log("All proofs captured cleanly.");
}

capture().catch((e) => {
	console.error(e);
	process.exit(1);
});
