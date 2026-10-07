/**
 * scripts/audit_sanpin_sterilization_layout.cjs
 *
 * Real Live Session Playwright inquisition capture script for SanPiN & Sterilization:
 * 1. SanpinAutoclaveRegisterTab (#sanpin / #sterilization)
 * 2. SanpinChemicalTestsRegisterTab / SanpinAzopyramTestTab (#sanpin/pso)
 * 3. SanpinKraftPacketsTab (#sanpin/kraft)
 * 4. SanpinUvAndCleaningRegisterTab / SanpinGeneralCleaningTab (#sanpin/cleaning)
 *
 * 4 States captured:
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/screenshots/audit_sanpin_sterilization");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionLiveSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing live clinic session on Fastify API 4100...");

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум (ЦСО)",
			email: `sanpin-inquisitor-${uniqueId}@dente-crm.ru`,
			password: "Password123!",
			ownerName: "Иванова Анна Сергеевна (Главная медсестра)",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	// Quick seed shift sterilization and PSO records
	try {
		await fetch(`${API_BASE}/api/registers/autofill-shift`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": initData.clinicToken,
				"x-dente-staff-token": unlockData.staffToken,
			},
			body: JSON.stringify({
				date: new Date().toISOString().slice(0, 10),
				operatorFullName: "Иванова А. С. (Медсестра ЦСО)",
				headNurseFullName: "Иванова А. С. (Главная медсестра)",
			}),
		});
		console.log("[Provisioning] Seeded shift sterilization records.");
	} catch (e) {
		console.warn("[Provisioning] Autofill shift note:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

const viewports = [
	{ name: "pc", width: 1440, height: 900, isMobile: false },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const themes = ["light", "dark"];

async function main() {
	console.log("=== STARTING SANPIN & STERILIZATION AUDIT PLAYWRIGHT SUITE ===");
	const auth = await provisionLiveSession();

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	try {
		for (const vp of viewports) {
			for (const theme of themes) {
				const label = `${vp.name}_${theme}`;
				console.log(`\n--- Capturing suite for: ${label} (${vp.width}x${vp.height}, theme=${theme}) ---`);

				const context = await browser.newContext({
					viewport: { width: vp.width, height: vp.height },
					isMobile: vp.isMobile,
					hasTouch: vp.hasTouch,
					colorScheme: theme,
				});

				// Inject live tokens and setup
				await context.addInitScript(
					({ ct, st, uid, th }) => {
						localStorage.setItem("dente_clinic_token", ct);
						localStorage.setItem("dente_staff_token", st);
						localStorage.setItem("dente_active_role", "owner");
						localStorage.setItem("dente_user_role", "owner");
						localStorage.setItem("dente_workspace_perspective", "owner");
						localStorage.setItem("dente_theme_mode", th);
						localStorage.setItem("dente_theme", th);
						localStorage.setItem("dente_onboarding_completed", "true");
						localStorage.setItem("dente_demo_showcase", "true");
						localStorage.setItem("dente_tour_completed", "true");
						localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
						localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
						localStorage.setItem(
							"dente_ui_preferences_v1",
							JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
						);
						localStorage.setItem(
							"dental-crm:onboarding:v1",
							JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }),
						);
						localStorage.setItem(
							"dental-crm:web-ui-preferences:v1",
							JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" }),
						);
						document.documentElement.setAttribute("data-theme", th);
						if (th === "dark") {
							document.documentElement.classList.add("dark");
						} else {
							document.documentElement.classList.remove("dark");
						}
					},
					{
						ct: auth.clinicToken,
						st: auth.staffToken,
						uid: auth.ownerUserId,
						th: theme,
					},
				);

				const page = await context.newPage();

				// Navigate to SanPiN & Sterilization view via direct hash route
				console.log(`[${label}] Navigating to http://127.0.0.1:5173/#sanpin ...`);
				await page.goto("http://127.0.0.1:5173/#sanpin", { waitUntil: "domcontentloaded", timeout: 20000 });
				await page.waitForSelector(".sanpin-container, .scanner-view-wrapper", { timeout: 15000 }).catch(() => null);
				await wait(2000);

				// Ensure data-theme is correctly set on html
				await page.evaluate((th) => {
					document.documentElement.setAttribute("data-theme", th);
					if (th === "dark") {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}, theme);
				await wait(500);

				// 1. SanpinAutoclaveRegisterTab (Main view)
				const shot1Path = path.join(outputDir, `01_autoclave_journal_${label}.png`);
				await page.screenshot({ path: shot1Path, fullPage: false });
				console.log(`[Captured] 01_autoclave_journal_${label}.png`);

				// 2. SanpinChemicalTestsRegisterTab / SanpinAzopyramTestTab (ПСО / Азопирам)
				await page.evaluate(() => {
					const el = document.querySelector('[data-testid="tab-pso-btn"]');
					if (el) el.click();
				});
				await wait(1000);
				const shot2Path = path.join(outputDir, `02_pso_azopyram_${label}.png`);
				await page.screenshot({ path: shot2Path, fullPage: false });
				console.log(`[Captured] 02_pso_azopyram_${label}.png`);

				// 3. SanpinKraftPacketsTab (Крафт-пакеты и маркировка)
				await page.evaluate(() => {
					const el = document.querySelector('[data-testid="tab-kraft-btn"]');
					if (el) el.click();
				});
				await wait(1000);
				const shot3Path = path.join(outputDir, `03_kraft_packets_tab_${label}.png`);
				await page.screenshot({ path: shot3Path, fullPage: false });
				console.log(`[Captured] 03_kraft_packets_tab_${label}.png`);

				// 4. Disinfection & General Cleaning
				await page.evaluate(() => {
					const el = document.querySelector('[data-testid="category-tab-disinfection"]');
					if (el) el.click();
				});
				await wait(1000);
				const shot4Path = path.join(outputDir, `04_disinfection_cleaning_${label}.png`);
				await page.screenshot({ path: shot4Path, fullPage: false });
				console.log(`[Captured] 04_disinfection_cleaning_${label}.png`);

				await context.close();
			}
		}
	} finally {
		await browser.close();
		console.log("=== SANPIN PLAYWRIGHT SUITE COMPLETE ===");
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
