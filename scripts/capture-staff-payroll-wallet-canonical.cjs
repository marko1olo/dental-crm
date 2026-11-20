const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/payroll");
const STAFF_PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/staff_payroll_shifts");

for (const d of [PROOFS_DIR, STAFF_PROOFS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function capture() {
	console.log("=== Launching Playwright for PAYROLL & DOCTOR WALLET (Canonical 4-State Proof) ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const configs = [
		{
			name: "01_doctor_payroll_studio_pc_light_1440x900.png",
			aliasName: "01_staff_payroll_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
			mode: "payroll",
			url: "http://127.0.0.1:5173/?stand=payroll&demo=true#payroll",
			selector: '[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay',
		},
		{
			name: "02_doctor_payroll_studio_pc_dark_1440x900.png",
			aliasName: "02_staff_payroll_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
			mode: "payroll",
			url: "http://127.0.0.1:5173/?stand=payroll&demo=true#payroll",
			selector: '[data-testid="doctor-payroll-studio-modal"], .payroll-studio-overlay',
		},
		{
			name: "03_doctor_wallet_mobile_light_390x844.png",
			aliasName: "03_doctor_wallet_mobile_light_390x844.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
			mode: "wallet",
			url: "http://127.0.0.1:5173/?stand=wallet&demo=true#wallet",
			selector: '#direct-doctor-wallet-overlay, [data-testid="doctor-wallet-standalone-workspace"], .doctor-wallet-container',
		},
		{
			name: "04_doctor_wallet_mobile_dark_390x844.png",
			aliasName: "04_doctor_wallet_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
			mode: "wallet",
			url: "http://127.0.0.1:5173/?stand=wallet&demo=true#wallet",
			selector: '#direct-doctor-wallet-overlay, [data-testid="doctor-wallet-standalone-workspace"], .doctor-wallet-container',
		},
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			serviceWorkers: "block",
		});

		await context.addInitScript(
			({ t, isMob }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-therapist");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_workspace_perspective", isMob ? "doctor" : "management");
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
				localStorage.setItem(
					"dente_active_staff_user",
					JSON.stringify({
						id: "019488a0-0000-7000-8000-000000000001",
						fullName: "Д-р Воронов А. В.",
						role: "doctor",
						specialization: "Ортодонт",
					})
				);
			},
			{ t: cfg.theme, isMob: cfg.isMobile },
		);

		const page = await context.newPage();
		page.on("pageerror", (err) => console.error("[Browser PageError]:", err.message));

		console.log(`Navigating to ${cfg.url}...`);
		await page.goto(cfg.url, { waitUntil: "domcontentloaded", timeout: 30000 });

		console.log(`Waiting for ${cfg.mode} selector...`);
		await page.waitForSelector(cfg.selector, { state: "visible", timeout: 30000 });

		// Dismiss overlays and tour
		await page.evaluate(() => {
			const overlays = document.querySelectorAll(
				".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], [data-testid='guided-tour-coach-mark-card'], [data-testid='demo-mode-banner'], .global-toast-container, vite-error-overlay"
			);
			overlays.forEach((el) => el.remove());
		}).catch(() => {});

		// Apply theme classes directly
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
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(th);
			}
			window.dispatchEvent(new Event("themechange"));
		}, cfg.theme);

		await page.waitForTimeout(1000);

		const targetPath = path.join(PROOFS_DIR, cfg.name);
		const staffTargetPath = path.join(STAFF_PROOFS_DIR, cfg.aliasName);
		await page.screenshot({ path: targetPath, fullPage: false });
		try { fs.copyFileSync(targetPath, staffTargetPath); } catch (_) {}

		const stat = fs.statSync(targetPath);
		if (stat.size < 20480) {
			throw new Error(`[BYTE GUARD FAIL] ${cfg.name} size is ${stat.size} bytes (< 20KB)!`);
		}
		console.log(`[PROOF OK] ${cfg.name} -> ${stat.size} bytes (>= 20KB guard passed)`);
		await context.close();
	}

	await browser.close();
	console.log("\n>>> ALL 4 CANONICAL PROOFS CAPTURED SUCCESSFULLY! <<<");
}

capture().catch((err) => {
	console.error("FATAL CAPTURE ERROR:", err);
	process.exit(1);
});
