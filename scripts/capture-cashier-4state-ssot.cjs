const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cashier");

if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
	console.log("Launching Chromium for Cashier 4-State SSOT proofs...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const configs = [
		{
			names: ["01_cashier_studio_pc_light_1440x900.png", "cash_shift_closing_pc_light.png"],
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
		},
		{
			names: ["02_cashier_studio_pc_dark_1440x900.png", "cash_shift_closing_pc_dark.png"],
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
		},
		{
			names: ["03_cashier_studio_mobile_light_390x844.png", "cash_shift_closing_mobile_light.png"],
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
		},
		{
			names: ["04_cashier_studio_mobile_dark_390x844.png", "cash_shift_closing_mobile_dark.png"],
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.names[0]} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			locale: "ru-RU",
			colorScheme: cfg.theme === "dark" ? "dark" : "light",
		});

		await context.addInitScript(
			({ t }) => {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				sessionStorage.setItem("dente_unlocked", "true");
				sessionStorage.setItem("dente:unlocked", "true");
				localStorage.setItem("dente:unlocked", "true");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("dente_offline_mode", "true");
				localStorage.setItem("dente_clinic_token", "demo_clinic_token");
				localStorage.setItem("dente_staff_token", "demo_staff_token");
				localStorage.setItem("dente_active_session_token", "demo_staff_token");
				localStorage.setItem("dente_organization_id", "org-demo-1");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_active_role", "cashier");
				localStorage.setItem("dente_user_role", "cashier");
				localStorage.setItem("dente_role", "cashier");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem(
					"dental-crm:active-user:v1",
					JSON.stringify({ id: "demo-cashier", fullName: "Кассир Воронова С. Н.", role: "cashier" }),
				);
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true }),
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "cashier",
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);
			},
			{ t: cfg.theme },
		);

		const page = await context.newPage();
		const targetUrl = "http://127.0.0.1:5173/?stand=cashbox&demo=true#shift-closing";
		await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(async () => {
			await page.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });
		});

		// Wait for boot state to detach and clean up any remaining splash
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
		await page.evaluate(() => {
			const boot = document.querySelector(".boot-state");
			if (boot) boot.remove();
		});

		// Wait for stand or journal view
		await page.waitForSelector('[data-testid="standalone-cashbox-ssot-root"], [data-testid="cash-shift-journal-view"], [data-testid="cash-shift-closing-modal"]', {
			state: "visible",
			timeout: 15000,
		}).catch(() => {});

		// Ensure theme class and attributes
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
		}, cfg.theme);

		// Check if modal is visible, otherwise dispatch open event
		let modal = await page.$('[data-testid="cash-shift-closing-modal"]');
		if (!modal) {
			console.log("Dispatching dente:open-z-report...");
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-z-report"));
			});
			modal = await page.waitForSelector('[data-testid="cash-shift-closing-modal"]', {
				state: "visible",
				timeout: 10000,
			}).catch(() => null);
		}

		// Remove any floating debug/tour overlays
		await page.evaluate(() => {
			document.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
			).forEach((el) => el.remove());
		});

		await page.waitForTimeout(1000);

		for (const name of cfg.names) {
			const outPath = path.join(PROOFS_DIR, name);
			await page.screenshot({ path: outPath, fullPage: false });
			const stat = fs.statSync(outPath);
			console.log(`Saved ${name}: ${(stat.size / 1024).toFixed(1)} KB`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\nAll 4 cashier proof screenshots captured successfully!");
}

capture().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
