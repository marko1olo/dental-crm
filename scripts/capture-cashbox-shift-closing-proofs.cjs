const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_SHIFT = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/shift");
const PROOFS_CASH_SHIFT = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cash_shift");

for (const d of [PROOFS_SHIFT, PROOFS_CASH_SHIFT]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function capture() {
	console.log("=== Capturing PC Light & Dark for Shift Closing ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const configs = [
		{
			id: "01_shift_closing_pc_light",
			paths: [
				path.join(PROOFS_SHIFT, "01_shift_studio_pc_light_1440x900.png"),
				path.join(PROOFS_SHIFT, "05_shift_closing_zreport_pc_light_1440x900.png"),
				path.join(PROOFS_CASH_SHIFT, "01_cash_shift_pc_light.png"),
			],
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
			url: "http://127.0.0.1:5173/?stand=shift&demo=true#shift-closing",
		},
		{
			id: "02_shift_closing_pc_dark",
			paths: [
				path.join(PROOFS_SHIFT, "02_shift_studio_pc_dark_1440x900.png"),
				path.join(PROOFS_SHIFT, "06_shift_closing_zreport_pc_dark_1440x900.png"),
				path.join(PROOFS_CASH_SHIFT, "02_cash_shift_pc_dark.png"),
			],
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
			url: "http://127.0.0.1:5173/?stand=shift&demo=true#shift-closing",
		},
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.id} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
			serviceWorkers: "block",
		});

		await context.addInitScript(
			({ t }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-cashier");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-cashier");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-cashier");
				localStorage.setItem("dente_active_role", "admin");
				localStorage.setItem("dente_user_role", "admin");
				localStorage.setItem("dente_role", "admin");
				localStorage.setItem("dente_workspace_perspective", "cashbox");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("demo_mode", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
			},
			{ t: cfg.theme }
		);

		const page = await context.newPage();

		try {
			console.log(`Navigating to ${cfg.url}...`);
			await page.goto(cfg.url, { waitUntil: "domcontentloaded", timeout: 30000 });

			await page.waitForSelector('[data-testid="cash-shift-closing-modal"], .shift-closing-modal', {
				state: "visible",
				timeout: 20000,
			});
			console.log(`[OK] Found modal!`);

			// Suppress tour & debug overlays
			await page.evaluate(() => {
				const overlays = document.querySelectorAll(
					".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], [data-testid='guided-tour-coach-mark-card'], [data-testid='demo-mode-banner'], .global-toast-container, vite-error-overlay"
				);
				overlays.forEach((el) => el.remove());
			}).catch(() => {});

			// Apply explicit theme tokens
			await page.evaluate((th) => {
				document.documentElement.setAttribute("data-theme", th);
				document.body.setAttribute("data-theme", th);
				const isDark = th === "dark";
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.body.classList.toggle("dark", isDark);
				document.body.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("dente_theme_mode", th);
			}, cfg.theme);

			await page.waitForTimeout(1000);

			const buffer = await page.screenshot({ fullPage: false });
			for (const p of cfg.paths) {
				fs.writeFileSync(p, buffer);
				console.log(`[SAVED] ${p} (${buffer.length} bytes)`);
			}
		} catch (err) {
			console.error(`[ERROR] Failed to capture ${cfg.id}:`, err.message);
		} finally {
			await context.close();
		}
	}

	await browser.close();
	console.log("\n=== PC capture complete! ===");
}

capture().catch((e) => {
	console.error("Fatal error:", e);
	process.exit(1);
});
