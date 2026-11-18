const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/frontend_state");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
	console.log("Launching Chromium for Odontogram & Omnibar verified 4-State Proofs on port 5173...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{ name: "01_odontogram_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", hash: "#odontogram" },
		{ name: "02_odontogram_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", hash: "#odontogram" },
		{ name: "03_omnibar_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", hash: "#odontogram", openOmnibar: true },
		{ name: "04_omnibar_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", hash: "#odontogram", openOmnibar: true },
		{ name: "05_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light", hash: "#odontogram" },
		{ name: "06_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark", hash: "#odontogram" },
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		await context.addInitScript(
			({ t }) => {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-token");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_workspace_perspective", "doctor");
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
			{ t: cfg.theme },
		);

		const page = await context.newPage();
		try {
			await page.goto(`http://127.0.0.1:5173/${cfg.hash}`, {
				waitUntil: "commit",
				timeout: 20000,
			});
			await page.waitForTimeout(3000);

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
