/**
 * scripts/audit_marketing_leads_layout.cjs
 *
 * Real Live Session Playwright inquisition capture script for:
 * 1. Marketing Dashboard & Intelligence (#marketing)
 * 2. Leads Kanban & 1-Click Conversion (#leads)
 *
 * Captures 4 states for each:
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/screenshots/audit_marketing_leads");
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
			clinicName: "Стоматология ДЕНТЕ Эксперт",
			email: `marketing-audit-${uniqueId}@dente-crm.ru`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
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

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	console.log("[Provisioning] Seeding live leads across marketing channels...");
	const leadsToSeed = [
		{
			name: "Кузнецов Роман Сергеевич",
			phone: "+7 (999) 111-22-33",
			source: "2ГИС Карты",
			notes: "Острая боль, пульпит зуба 4.6, срочный приём",
			priority: "high",
			expectedRevenue: "25000",
		},
		{
			name: "Смирнова Анна Викторовна",
			phone: "+7 (926) 222-33-44",
			source: "Яндекс.Директ ?utm_source=yandex&utm_campaign=implants_spring",
			notes: "Консультация хирурга-имплантолога, All-on-4",
			priority: "high",
			expectedRevenue: "180000",
		},
		{
			name: "Морозов Игорь Дмитриевич",
			phone: "+7 (916) 333-44-55",
			source: "ПроДокторов",
			notes: "Эстетическая реставрация зоны улыбки (виниры E.max)",
			priority: "normal",
			expectedRevenue: "95000",
		},
		{
			name: "Васильева Елена Павловна",
			phone: "+7 (903) 444-55-66",
			source: "Рекомендации / Сарафан",
			notes: "Профгигиена Air-Flow + отбеливание Zoom 4",
			priority: "normal",
			expectedRevenue: "32000",
		},
		{
			name: "Дмитриев Павел Олегович",
			phone: "+7 (985) 555-66-77",
			source: "Авито",
			notes: "Удаление ретинированного зуба мудрости 3.8",
			priority: "urgent",
			expectedRevenue: "15000",
		},
		{
			name: "Ковалева Ольга Андреевна",
			phone: "+7 (977) 666-77-88",
			source: "Яндекс.Карты / Гео",
			notes: "Лечение кариеса 2-х зубов, эстетические пломбы",
			priority: "normal",
			expectedRevenue: "18000",
		},
	];

	for (const lead of leadsToSeed) {
		try {
			await fetch(`${API_BASE}/api/leads`, {
				method: "POST",
				headers,
				body: JSON.stringify(lead),
			});
		} catch (err) {
			console.warn("[Provisioning] Warning seeding lead:", lead.name, err.message);
		}
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
	};
}

const viewports = [
	{ name: "pc", width: 1440, height: 900, isMobile: false, hasTouch: false },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const themes = ["light", "dark"];

async function main() {
	console.log("=== STARTING MARKETING & LEADS AUDIT PLAYWRIGHT SUITE ===");
	const auth = await provisionLiveSession();

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const launchOptions = fs.existsSync(chromePath)
		? {
				executablePath: chromePath,
				headless: true,
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-dev-shm-usage",
					"--disable-gpu",
				],
			}
		: {
				channel: "msedge",
				headless: true,
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-dev-shm-usage",
					"--disable-gpu",
				],
			};

	const browser = await chromium.launch(launchOptions);

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

				await context.addInitScript(
					({ ct, st, th }) => {
						localStorage.setItem("dente_clinic_token", ct);
						localStorage.setItem("dente_staff_token", st);
						localStorage.setItem("dente_active_role", "owner");
						localStorage.setItem("dente_user_role", "owner");
						localStorage.setItem("dente_workspace_perspective", "owner");
						localStorage.setItem("dente_theme_mode", th);
						localStorage.setItem("dente_onboarding_completed", "true");
						localStorage.setItem("dente_demo_showcase", "true");
						localStorage.setItem("dente_tour_completed", "true");
						localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
						localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
						localStorage.setItem(
							"dente_ui_preferences_v1",
							JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
						);
					},
					{
						ct: auth.clinicToken,
						st: auth.staffToken,
						th: theme,
					},
				);

				const page = await context.newPage();

				// Ensure theme class is applied on body
				await page.addInitScript((th) => {
					window.addEventListener("DOMContentLoaded", () => {
						if (th === "dark") {
							document.documentElement.classList.add("dark");
							document.body.classList.add("dark");
							document.documentElement.classList.remove("light");
							document.body.classList.remove("light");
						} else {
							document.documentElement.classList.add("light");
							document.body.classList.add("light");
							document.documentElement.classList.remove("dark");
							document.body.classList.remove("dark");
						}
					});
				}, theme);

				// 1. Capture #marketing
				console.log(`[${label}] Navigating to http://127.0.0.1:5173/#marketing ...`);
				await page.goto("http://127.0.0.1:5173/#marketing", {
					waitUntil: "domcontentloaded",
					timeout: 25000,
				});
				await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
				await wait(2000);

				// Force theme on DOM
				await page.evaluate((th) => {
					document.documentElement.setAttribute("data-theme", th);
					if (th === "dark") {
						document.documentElement.classList.add("dark");
						document.body.classList.add("dark");
						document.documentElement.classList.remove("light");
						document.body.classList.remove("light");
					} else {
						document.documentElement.classList.add("light");
						document.body.classList.add("light");
						document.documentElement.classList.remove("dark");
						document.body.classList.remove("dark");
					}
				}, theme);
				await wait(800);

				const marketingFile = path.join(outputDir, `marketing_promos_${label}.png`);
				await page.screenshot({ path: marketingFile, fullPage: false });
				console.log(`[${label}] Saved: ${marketingFile}`);

				// Capture Marketing Analytics Tab
				const analyticsTabBtn = page.locator('[data-testid="tab-nav-analytics"]');
				if (await analyticsTabBtn.isVisible()) {
					await analyticsTabBtn.click();
					await wait(1000);
					const analyticsFile = path.join(outputDir, `marketing_analytics_${label}.png`);
					await page.screenshot({ path: analyticsFile, fullPage: false });
					console.log(`[${label}] Saved: ${analyticsFile}`);
				}

				// Capture Marketing ROMI Tab
				const romiTabBtn = page.locator('[data-testid="tab-nav-romi"]');
				if (await romiTabBtn.isVisible()) {
					await romiTabBtn.click();
					await wait(1000);
					const romiFile = path.join(outputDir, `marketing_romi_${label}.png`);
					await page.screenshot({ path: romiFile, fullPage: false });
					console.log(`[${label}] Saved: ${romiFile}`);
				}

				// 2. Capture #leads
				console.log(`[${label}] Navigating to http://127.0.0.1:5173/#leads ...`);
				await page.goto("http://127.0.0.1:5173/#leads", {
					waitUntil: "domcontentloaded",
					timeout: 25000,
				});
				await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
				await wait(2000);

				await page.evaluate((th) => {
					document.documentElement.setAttribute("data-theme", th);
					if (th === "dark") {
						document.documentElement.classList.add("dark");
						document.body.classList.add("dark");
						document.documentElement.classList.remove("light");
						document.body.classList.remove("light");
					} else {
						document.documentElement.classList.add("light");
						document.body.classList.add("light");
						document.documentElement.classList.remove("dark");
						document.body.classList.remove("dark");
					}
				}, theme);
				await wait(800);

				const leadsFile = path.join(outputDir, `leads_kanban_${label}.png`);
				await page.screenshot({ path: leadsFile, fullPage: false });
				console.log(`[${label}] Saved: ${leadsFile}`);

				// On PC: Capture Lead Convert Modal (1-click appointment booking with consents)
				if (!vp.isMobile) {
					const bookBtn = page.locator('[data-testid="lead-card-book-appointment-btn"]').first();
					if (await bookBtn.isVisible()) {
						await bookBtn.click();
						await wait(1000);
						const modalFile = path.join(outputDir, `leads_convert_modal_${label}.png`);
						await page.screenshot({ path: modalFile, fullPage: false });
						console.log(`[${label}] Saved: ${modalFile}`);
					}
				}

				await context.close();
			}
		}
		console.log("\n=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR IN CAPTURE]:", err);
	process.exit(1);
});
