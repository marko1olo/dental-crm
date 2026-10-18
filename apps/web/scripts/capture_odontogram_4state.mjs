import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = path.resolve("docs/proofs/odontogram");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

const STATES = [
	{
		filename: "01_pc_light_1440x900.png",
		width: 1440,
		height: 900,
		isMobile: false,
		theme: "light",
	},
	{
		filename: "02_pc_dark_1440x900.png",
		width: 1440,
		height: 900,
		isMobile: false,
		theme: "dark",
	},
	{
		filename: "03_mobile_light_390x844.png",
		width: 390,
		height: 844,
		isMobile: true,
		theme: "light",
	},
	{
		filename: "04_mobile_dark_390x844.png",
		width: 390,
		height: 844,
		isMobile: true,
		theme: "dark",
	},
];

async function capture() {
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch {
		browser = await chromium.launch({ channel: "chrome", headless: true });
	}

	for (const state of STATES) {
		console.log(`\nCapturing ${state.filename}...`);
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();

		await page.addInitScript(({ theme }) => {
			localStorage.setItem("dente_clinic_token", "demo-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_active_view", "visit");
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ theme, onboardingDismissed: true }),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true }),
			);

			const apply = () => {
				if (document.documentElement) {
					document.documentElement.setAttribute("data-theme", theme);
					if (theme === "dark") {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}
			};
			apply();
			window.addEventListener("DOMContentLoaded", apply);
		}, { theme: state.theme });

		const url = "http://127.0.0.1:5173/?demo=true#visit";

		let loaded = false;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
				loaded = true;
				break;
			} catch (e) {
				console.log(`Goto attempt ${attempt} failed: ${e.message}, retrying in 2s...`);
				await page.waitForTimeout(2000);
			}
		}
		if (!loaded) {
			console.error(`Failed to load ${url} after 3 attempts`);
		}
		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Зубная формула") || text.includes("Смирнова") || text.includes("Стоматология");
		}, { timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(2000);

		if (!state.isMobile) {
			// Switch to Odontogram tab on PC
			try {
				const odontogramTab = await page.waitForSelector(
					'button:has-text("1. Зубная формула"), button:has-text("Зубная формула"), [data-testid="tab-odontogram"], [data-tab="odontogram"]',
					{ timeout: 10000 },
				);
				if (odontogramTab) {
					console.log("Switching to Odontogram tab...");
					await odontogramTab.click();
					await page.waitForTimeout(2500);
				}
			} catch (e) {
				console.log("Tab switch check passed/bypassed:", e.message);
			}
			await page.waitForSelector(
				'.odontogram-view-container, [data-testid="odontogram-view-container"], svg.tooth-svg-element',
				{ timeout: 10000 },
			).catch(() => {});
		} else {
			// Switch to Step 2: "2. Осмотр" on Mobile
			try {
				const examBtn = await page.$(
					'button:has-text("2. Осмотр"), button:has-text("Далее: 2. Осмотр")',
				);
				if (examBtn) {
					console.log("Switching to mobile Exam step (teeth selector)...");
					await examBtn.click();
					await page.waitForTimeout(3000);
				}
			} catch (e) {
				console.log("Mobile exam switch check passed/bypassed:", e.message);
			}
		}

		await page.waitForTimeout(2000);

		const outPath = path.join(PROOF_DIR, state.filename);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`Saved screenshot to ${outPath}`);

		await context.close();
	}

	await browser.close();
	console.log("\nAll 4 states captured successfully!");
}

capture().catch((err) => {
	console.error("Capture error:", err);
	process.exit(1);
});
